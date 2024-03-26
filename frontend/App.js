import React, { useState } from 'react'
import { NavigationContainer, useIsFocused } from '@react-navigation/native'
import {
  Text,
  // AppRegistry,
  StyleSheet,
  TouchableOpacity,
  // Linking,
} from 'react-native'
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';

const App = () => {
  const { hasPermission, requestPermission } = useCameraPermission()
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      console.log(`Scanned ${codes.length} codes!`)
    }
  })
  const device = useCameraDevice('back', {
    physicalDevices: [
      'ultra-wide-angle-camera',
      'wide-angle-camera',
      'telephoto-camera'
    ]
  })
  const isFocused = useIsFocused()
  const isActive = isFocused
  // const appState = useAppState()
  // const isActive = isFocused && appState === "active"

  const [data, setData] = useState("Scan something...")

  return (
    <NavigationContainer>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        codeScanner={codeScanner}
      />
      {/* <AppStackNavigator /> */}
      {/* <Stack.Navigator initialRouteName='login' screenOptions={{headerShown: false}}>                    
        <Stack.Screen component={AppFooter} name='authorized' />
        <Stack.Screen component={Login} name='login'/>              
    </Stack.Navigator> */}
      {/* <AppFooter /> */}
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  centerText: {
    flex: 1,
    fontSize: 18,
    padding: 32,
    color: '#777'
  },
  textBold: {
    fontWeight: '500',
    color: '#000'
  },
  buttonText: {
    fontSize: 21,
    color: 'rgb(0,122,255)'
  },
  buttonTouchable: {
    padding: 16
  }
});

export default App
