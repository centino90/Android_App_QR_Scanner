import * as React from 'react';
import { useEffect, useState } from 'react';
import { StyleSheet, SafeAreaView, Platform, Dimensions, Pressable, View, Modal, Text } from 'react-native';
import { Camera, runAtTargetFps, useCameraDevice, useCameraFormat, useFrameProcessor } from 'react-native-vision-camera';
import { useSharedValue } from 'react-native-worklets-core';
import { type CropRegion, crop } from 'vision-camera-cropper';
import { Svg, Rect, Circle, Image } from 'react-native-svg';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [imageData, setImageData] = useState<undefined | string>(undefined);
  const [frameWidth, setFrameWidth] = useState(1080);
  const [frameHeight, setFrameHeight] = useState(1920);
  const [cropRegion, setCropRegion] = useState({
    left: 0,
    top: 0,
    width: 100,
    height: 100
  });
  const cropRegionShared = useSharedValue<undefined | CropRegion>(undefined);
  const taken = useSharedValue(false);
  const shouldTake = useSharedValue(false);
  const [pressed, setPressed] = useState(false);
  const device = useCameraDevice("back");
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1920, height: 1080 } },
    { fps: 30 }
  ])
  const [modalVisible, setModalVisible] = useState(false);
  // const modalVisibleShared = useSharedValue(false);
  const [qrData, setQrData] = useState(null);
  const updateFrameSize = (width: number, height: number) => {
    if (width != frameWidth && height != frameHeight) {
      setFrameWidth(width);
      setFrameHeight(height);
    }
  }

  const updateCropRegion = () => {
    const size = getFrameSize();
    let region;
    if (size.width > size.height) {
      let regionWidth = 0.7 * size.width;
      // let desiredRegionHeight = regionWidth / (85.6 / 54);
      let desiredRegionHeight = regionWidth;
      let height = Math.ceil(desiredRegionHeight / size.height * 100);
      region = {
        left: 15,
        width: 70,
        top: 10,
        height: height
      };
    } else {
      let regionWidth = 0.7 * size.width;
      // let desiredRegionHeight = regionWidth / (85.6 / 54);
      let desiredRegionHeight = regionWidth;
      let height = Math.ceil(desiredRegionHeight / size.height * 100);
      region = {
        left: 15,
        width: 70,
        top: 20,
        height: height
      };
    }
    setCropRegion(region);
    cropRegionShared.value = region;
  }

  const sendFrame = async (frame: any) => {
    // if (modalVisible) return

    const result = await fetch(`http://localhost:5000/process_qr_code`, {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json'
      },
      body: JSON.stringify(
        {
          image: frame
        }
      )
    })

    const response = await result.json();

    taken.value = true;
    shouldTake.value = false;

    if (!response?.decoded_data) {
      setQrData({
        error: 'The captured image is not a valid QR'
      })
      setModalVisible(true)
      return
    }

    if (typeof response.decoded_data == 'string') {
      setQrData({
        error: 'The captured image does not contain the correct data',
        data: response.decoded_data
      })
      setModalVisible(true)
      return
    }

    setQrData(response.decoded_data)
    setModalVisible(true)

    return response.decoded_data
  }

  const qrResult = React.useMemo(() => {
    const _qrData = qrData;
    return _qrData;
  }, [qrData])

  const setModalVisibleJS = Worklets.createRunInJsFn(setModalVisible);
  const sendFrameJS = Worklets.createRunInJsFn(sendFrame);
  const updateFrameSizeJS = Worklets.createRunInJsFn(updateFrameSize);
  const setImageDataJS = Worklets.createRunInJsFn(setImageData);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet'

    runAtTargetFps(1, () => {
      'worklet'

      if (modalVisible) {
        return
      }

      updateFrameSizeJS(frame.width, frame.height);
      if (taken.value == false && shouldTake.value == true && cropRegionShared.value != undefined) {
        // console.log(cropRegionShared.value);
        const result = crop(frame, { cropRegion: cropRegionShared.value, includeImageBase64: true });
        // console.log(result);
        if (result?.base64) {
          const jpegImg = result.base64
          sendFrameJS(jpegImg)
          setImageDataJS("data:image/jpeg;base64," + result.base64);
        }
      }
    })
  }, [])

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
      setIsActive(true);
      updateCropRegion();
    })();
  }, []);

  useEffect(() => {
    updateCropRegion();
  }, [frameWidth, frameHeight]);

  const getViewBox = () => {
    const frameSize = getFrameSize();
    console.log("getViewBox");
    console.log(frameSize);
    const viewBox = "0 0 " + frameSize.width + " " + frameSize.height;
    return viewBox;
  }

  const getViewBoxForCroppedImage = () => {
    const frameSize = getFrameSize();
    const viewBox = "0 0 " + (frameSize.width * cropRegion.width / 100) + " " + (frameSize.height * cropRegion.height / 100);
    return viewBox;
  }

  const getFrameSize = (): { width: number, height: number } => {
    let width: number, height: number;
    if (HasRotation()) {
      width = frameHeight;
      height = frameWidth;
    } else {
      width = frameWidth;
      height = frameHeight;
    }
    return { width: width, height: height };
  }

  const HasRotation = () => {
    let value = false
    if (Platform.OS === 'android') {
      if (!(frameWidth > frameHeight && Dimensions.get('window').width > Dimensions.get('window').height)) {
        value = true;
      }
    }
    return value;
  }

  const renderImage = () => {
    if (imageData != undefined) {
      return (
        <Svg style={styles.srcImage} viewBox={getViewBoxForCroppedImage()}>
          <Image
            href={{ uri: imageData }}
          />
        </Svg>
      );
    }
    return null;
  }



  return (
    <SafeAreaView style={styles.container}>
      {device != null &&
        hasPermission && (
          <>
          <Camera
            style={
              isInitialized
                ? {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }
                : {
                  width: 0,
                  height: 0,
                }
            }
            isActive={isActive}
            device={device}
            format={format}
            frameProcessor={frameProcessor}
            pixelFormat='yuv'
            onInitialized={() => {
              setIsInitialized(true);
            }}
          />
          <Svg preserveAspectRatio={(Platform.OS == 'ios') ? '' : 'xMidYMid slice'} style={StyleSheet.absoluteFill} viewBox={getViewBox()}>
            <Rect
              x={cropRegion.left / 100 * getFrameSize().width}
              y={cropRegion.top / 100 * getFrameSize().height}
              width={cropRegion.width / 100 * getFrameSize().width}
              height={cropRegion.height / 100 * getFrameSize().height}
              strokeWidth="2"
              stroke="red"
              fillOpacity={0.0}
            />
          </Svg>
          <View style={styles.control}>
            <View style={{ flex: 1.0 }}>
              <Svg viewBox={'0 0 ' + getWindowWidth() + ' ' + getWindowHeight() * 0.1}>
                <Circle
                  x={getWindowWidth() / 2}
                  y={getWindowHeight() * 0.1 / 2}
                  r={getWindowHeight() * 0.1 / 2}
                  fill="gray"
                >
                </Circle>
                <Circle
                  x={getWindowWidth() / 2}
                  y={getWindowHeight() * 0.1 / 2}
                  r={getWindowHeight() * 0.08 / 2}
                  fill={pressed ? "gray" : "white"}
                  onPressIn={() => {
                    console.log("on press in ")
                    setPressed(true);
                  }}
                  onPressOut={() => {
                    setPressed(false);
                    shouldTake.value = true;
                  }}
                >
                </Circle>
              </Svg>
            </View>
          </View>
          <Modal
            animationType="slide"
            transparent={true}
            visible={(imageData != undefined && modalVisible)}
            onRequestClose={() => {
              setImageData(undefined);
            }}
          >
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                {renderImage()}
                <View style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  alignSelf: 'stretch',
                }}>

                  {
                    !qrResult?.error && Object.keys(qrResult ?? {})?.map((row, index) => (
                      <View key={index} style={{
                        backgroundColor: '#f0f0f0',
                        // height: 50,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderBottomColor: '#d7d7d7',
                        borderBottomWidth: 1,
                        alignSelf: 'stretch',
                        textAlign: 'center',
                        padding: 5,
                      }}>
                        <Text style={{
                          fontSize: 16,
                          color: '#bfbfbf'
                        }}>{row ? row.replace(/_/g, ' ') : ''}</Text>
                        <Text style={{
                          fontSize: 20,
                          color: '#8f8f8f'
                        }}>{qrResult[row] ?? ''}</Text>
                      </View>
                    ))
                  }

                  {
                    qrResult?.error && qrResult?.data && (
                      <>
                        <View style={{
                          backgroundColor: '#ffedcc',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderBottomColor: '#d7d7d7',
                          borderBottomWidth: 1,
                          padding: 7,
                          alignSelf: 'stretch',
                          textAlign: 'center'
                        }}>
                          <Text style={{
                            fontSize: 20,
                            color: '#ffa500'
                          }}>{qrResult.error ?? ''}</Text>
                        </View>
                        <View style={{
                          marginTop: 30,
                          backgroundColor: '#f0f0f0',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderBottomColor: '#d7d7d7',
                          borderBottomWidth: 1,
                          padding: 7,
                          alignSelf: 'stretch',
                          textAlign: 'center'
                        }}>
                          <Text style={{
                            fontSize: 16,
                            color: '#bfbfbf'
                          }}>Decoded data</Text>
                          <Text style={{
                            fontSize: 20,
                            color: '#8f8f8f'
                          }}>{qrResult.data ?? ''}</Text>
                        </View>
                      </>
                    )
                  }

                    {
                      qrResult?.error && !qrResult?.data && (
                        <View style={{
                          backgroundColor: '#ffb3b3',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderBottomColor: '#d7d7d7',
                          borderBottomWidth: 1,
                          alignSelf: 'stretch',
                          textAlign: 'center',
                          padding: 5,
                        }}>
                          <Text style={{
                            fontSize: 20,
                            color: '#ff4747'
                          }}>{qrResult.error ?? ''}</Text>
                        </View>
                      )
                    }
                  </View>
                  <View style={styles.buttonView}>
                    <Pressable
                      style={[styles.button, styles.buttonClose]}
                      onPress={() => {
                        setImageData(undefined);
                        setModalVisible(false)
                        taken.value = false;
                      }}
                    >
                      <Text style={styles.textStyle}>Rescan</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          </>)}
    </SafeAreaView>
  );
}

const getWindowWidth = () => {
  return Dimensions.get("window").width;
}

const getWindowHeight = () => {
  return Dimensions.get("window").height;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
  control: {
    flexDirection: "row",
    position: 'absolute',
    bottom: 0,
    height: "10%",
    width: "100%",
    alignSelf: "flex-start",
    borderColor: "white",
    borderWidth: 0.1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  buttonView: {
    flexDirection: 'row',
  },
  button: {
    borderRadius: 20,
    padding: 10,
    margin: 5
  },
  buttonOpen: {
    backgroundColor: "#F194FF",
  },
  buttonClose: {
    backgroundColor: "#2196F3",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  srcImage: {
    width: getWindowWidth() * 0.7,
    height: 100,
    resizeMode: "contain"
  },
});