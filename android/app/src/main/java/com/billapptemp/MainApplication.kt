package com.billapptemp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // VoicePackage is auto-linked via autolinkLibrariesWithApp() in build.gradle
          // Adding it manually here caused a double-registration (NativeModules.Voice = null)
          // CameraPackage kept here if autolinking doesn't pick it up
          add(com.mrousavy.camera.react.CameraPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
