import * as React from 'react';
import { StyleSheet, SafeAreaView, Alert, Modal, Pressable, Text, View, Dimensions, Platform } from 'react-native';
import { Camera, runAtTargetFps, useCameraDevice, useCameraFormat, useFrameProcessor } from 'react-native-vision-camera';
import { Svg, Rect } from 'react-native-svg';
import { Worklets, useSharedValue } from 'react-native-worklets-core';
import { CropRegion, crop } from 'vision-camera-cropper';

const scanRegion = {
  left: 5,
  top: 30,
  width: 90,
  height: 40,
}

console.log('getWH', Dimensions.get('window').width, Dimensions.get('window').height)
function App(): React.JSX.Element {
  const [frameWidth, setFrameWidth] = React.useState(1080);
  const [frameHeight, setFrameHeight] = React.useState(1920);
  const [cropRegion, setCropRegion] = React.useState({
    left: 0,
    top: 0,
    width: 100,
    height: 100
  });
  const cropRegionShared = useSharedValue<undefined | CropRegion>(undefined);
  const [isInitialized, setIsInitialized] = React.useState(null)
  const device = useCameraDevice(isInitialized ? 'back' : 'front');
  const format = useCameraFormat(device, [
    // { videoResolution: { width: 1920, height: 1080 } },
    { photoResolution: { width: 1920, height: 1080 } },
    // { fps: 1 }
  ])
  console.log('format===', format)

  const [screenWidth, setScreenWidth] = React.useState(Dimensions.get('screen').width);
  const [screenHeight, setScreenHeight] = React.useState(Dimensions.get('screen').height);

  const [isActive, setIsActive] = React.useState(true);
  const [modalVisible, setModalVisible] = React.useState(false);
  const modalVisibleShared = useSharedValue(false);
  const [hasPermission, setHasPermission] = React.useState(false);
  const [qrData, setQrData] = React.useState(null);

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
      let desiredRegionHeight = regionWidth / (85.6 / 54);
      let height = Math.ceil(desiredRegionHeight / size.height * 100);
      region = {
        left: 15,
        width: 70,
        top: 10,
        height: height
      };
    } else {
      let regionWidth = 0.8 * size.width;
      let desiredRegionHeight = regionWidth / (85.6 / 54);
      let height = Math.ceil(desiredRegionHeight / size.height * 100);
      region = {
        left: 10,
        width: 80,
        top: 20,
        height: height
      };
    }
    setCropRegion(region);
    cropRegionShared.value = region;
  }

  const sendFrame = async (frame: any) => {
    if (modalVisible) return

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

    if (!response?.decoded_data) {
      setQrData({
        error: 'The captured image is not a valid QR'
      })
      setModalVisibleJS(true)
      return
    }

    if (typeof response.decoded_data == 'string') {
      setQrData({
        error: 'The captured image does not contain the correct data',
        data: response.decoded_data
      })
      setModalVisibleJS(true)
      return
    }

    setQrData(response.decoded_data)
    setModalVisibleJS(true)

    return response.decoded_data
  }

  const qrResult = React.useMemo(() => {
    const _qrData = qrData;
    return _qrData;
  }, [qrData])

  const setModalVisibleJS = Worklets.createRunInJsFn(setModalVisible);
  const sendFrameJS = Worklets.createRunInJsFn(sendFrame);
  const updateFrameSizeJS = Worklets.createRunInJsFn(updateFrameSize);
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet'

    if (modalVisible) {
      return
    }

    runAtTargetFps(.3, () => {
      'worklet'
      if (modalVisible) {
        return
      }
      updateFrameSizeJS(frame.width, frame.height);

      let defactoRegion = {
        left: 0,
        top: 0,
        width: 100,
        height: 100
      }

      const result = crop(frame, { cropRegion: defactoRegion, includeImageBase64: true, saveAsFile: false });
      // const result = crop(frame, { cropRegion: cropRegionShared.value, includeImageBase64: true, saveAsFile: false });

      // const result = crop(frame, {
      //   cropRegion: scanRegion, includeImageBase64: true, saveAsFile: false
      // });
      const jpegImg = result.base64

      sendFrameJS(jpegImg)
    })
  }, [])

  React.useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');

    })();
    return () => {
      console.log("unmounted");
      setIsActive(false);
    }
  }, []);

  React.useEffect(() => {
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


  return (
    <Camera
      // style={StyleSheet.absoluteFill}
      style={
        isInitialized ? {
          width: screenWidth,
          height: screenHeight
        } : {
          width: screenWidth * 2,
          height: screenHeight * 2
        }
      }
      isActive={isActive}
      device={device}
      // format={{
      //   photoHeight:
      // }}
      format={format}
      frameProcessor={frameProcessor}
      // pixelFormat='yuv'
      onInitialized={() => setIsInitialized(true)}
    // orientation='portrait'
    // style={
    //   isInitialized ? {
    //     width: getFrameSize().width,
    //     height: getFrameSize().height
    //   } : StyleSheet.absoluteFill
    // }
    >
    </Camera>
    // <SafeAreaView style={{ ...styles.container, backgroundColor: '#fff', position: 'relative' }}>
    //   {device != null &&
    //     hasPermission && (
    //       <>
    //         <Camera
    //         // style={StyleSheet.absoluteFill}
    //           isActive={isActive}
    //         device={device}
    //         format={format}
    //         frameProcessor={frameProcessor}
    //         pixelFormat='yuv'
    //         onInitialized={() => setIsInitialized(true)}
    //         // orientation='portrait'
    //         style={
    //           isInitialized ? {
    //             width: getFrameSize().width,
    //             height: getFrameSize().height
    //           } : StyleSheet.absoluteFill
    //         }
    //         // device={device}
    //         // isActive={isActive && !modalVisible}
    //         // frameProcessor={frameProcessor}
    //         // onInitialized={() => setIsInitialized(true)}
    //         // orientation='portrait'
    //         >
    //         </Camera>
    //       <Svg preserveAspectRatio={(Platform.OS == 'ios') ? '' : 'xMidYMid slice'} style={StyleSheet.absoluteFill} viewBox={getViewBox()} >
    //         <Rect
    //           x={cropRegion.left / 100 * getFrameSize().width}
    //           y={cropRegion.top / 100 * getFrameSize().height}
    //           width={cropRegion.width / 100 * getFrameSize().width}
    //           height={cropRegion.height / 100 * getFrameSize().height}
    //           strokeWidth="2"
    //           stroke="red"
    //           fillOpacity={0.0}
    //         />
    //       </Svg>
    //       </>)}
    //   <Modal
    //     animationType="slide"
    //     transparent={true}
    //     visible={modalVisible}
    //     onRequestClose={() => {
    //       Alert.alert("Modal has been closed.");
    //       modalVisibleShared.value = !modalVisible;
    //       setModalVisible(!modalVisible);
    //     }}
    //   >
    //     <View style={styles.centeredView}>
    //       <View style={styles.centeredView}>
    //         <View style={{
    //           ...styles.modalView,
    //           width: getWindowWidth()
    //         }}>

    //           {
    //             !qrResult?.error && Object.keys(qrResult ?? {})?.map((row, index) => (
    //               <View key={index} style={{
    //                 backgroundColor: '#f0f0f0',
    //                 width: '100%',
    //                 height: 50,
    //                 flex: 1,
    //                 alignItems: 'center',
    //                 justifyContent: 'center',
    //                 borderBottomColor: '#d7d7d7',
    //                 borderBottomWidth: 1
    //               }}>
    //                 <Text style={{
    //                   fontSize: 16,
    //                   color: '#bfbfbf'
    //                 }}>{row ? row.replace(/_/g, ' ') : ''}</Text>
    //                 <Text style={{
    //                   fontSize: 20,
    //                   color: '#8f8f8f'
    //                 }}>{qrResult[row] ?? ''}</Text>
    //               </View>
    //             ))
    //           }

    //           {
    //             qrResult?.error && qrResult?.data && (
    //               <>
    //                 <View style={{
    //                   backgroundColor: '#ffedcc',
    //                   width: '100%',
    //                   height: 70,
    //                   alignItems: 'center',
    //                   justifyContent: 'center',
    //                   borderBottomColor: '#d7d7d7',
    //                   borderBottomWidth: 1,
    //                   padding: 7,
    //                 }}>
    //                   <Text style={{
    //                     fontSize: 20,
    //                     color: '#ffa500'
    //                   }}>{qrResult.error ?? ''}</Text>
    //                 </View>
    //                 <View style={{
    //                   marginTop: 30,
    //                   backgroundColor: '#f0f0f0',
    //                   width: '100%',
    //                   height: 50,
    //                   alignItems: 'center',
    //                   justifyContent: 'center',
    //                   borderBottomColor: '#d7d7d7',
    //                   borderBottomWidth: 1
    //                 }}>
    //                   <Text style={{
    //                     fontSize: 16,
    //                     color: '#bfbfbf'
    //                   }}>Decoded data</Text>
    //                   <Text style={{
    //                     fontSize: 20,
    //                     color: '#8f8f8f'
    //                   }}>{qrResult.data ?? ''}</Text>
    //                 </View>
    //               </>
    //             )
    //           }

    //           {
    //             qrResult?.error && !qrResult?.data && (
    //               <View style={{
    //                 backgroundColor: '#ffb3b3',
    //                 width: '100%',
    //                 height: 50,
    //                 alignItems: 'center',
    //                 justifyContent: 'center',
    //                 borderBottomColor: '#d7d7d7',
    //                 borderBottomWidth: 1,
    //               }}>
    //                 <Text style={{
    //                   fontSize: 20,
    //                   color: '#ff4747'
    //                 }}>{qrResult.error ?? ''}</Text>
    //               </View>
    //             )
    //           }
    //           <View style={styles.buttonView}>
    //             <Pressable
    //               style={[styles.button, styles.buttonClose]}
    //               onPress={() => {
    //                 setModalVisible(!modalVisible)
    //               }}
    //             >
    //               <Text style={styles.textStyle}>Scan Again</Text>
    //             </Pressable>
    //           </View>
    //         </View>
    //       </View>
    //     </View>
    //   </Modal>
    // </SafeAreaView>
  );
}

const monospaceFontFamily = () => {
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
    height: 100,
    marginVertical: 20,
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
    height: 500,
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
  itemView: {
    // borderBottomColor: '#F194FF',
    color: 'red',
    width: 900,
  },
  buttonView: {
    marginTop: 15,
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
  modalText: {
    marginBottom: 10,
    textAlign: "left",
    fontSize: 12,
    fontFamily: monospaceFontFamily()
  },
  lowConfidenceText: {
    color: "red",
  },
  srcImage: {
    width: getWindowWidth() * 0.7,
    height: 60,
    resizeMode: "contain"
  },
});

export default App;
