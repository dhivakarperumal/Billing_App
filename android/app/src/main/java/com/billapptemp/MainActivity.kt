package com.billapptemp

import android.os.Build
import android.os.Bundle
import android.view.View

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

override fun onCreate(savedInstanceState: Bundle?) {
  super.onCreate(savedInstanceState)

  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    val window = window

    // 🔥 WHITE background
    window.navigationBarColor = 0xFFFFFFFF.toInt()

    // 🔥 BLACK icons
    window.decorView.systemUiVisibility =
        View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
  }
}

  override fun getMainComponentName(): String = "BillAppTemp"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
