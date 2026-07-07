package com.shiftnotes.app

import android.os.Bundle
import android.view.WindowManager
import androidx.core.view.WindowCompat
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Edge-to-edge: let the web content draw behind status/nav bars
        WindowCompat.setDecorFitsSystemWindows(window, false)
        // Keep screen on while shift is active (optional – remove if not wanted)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        super.onCreate(savedInstanceState)
    }
}
