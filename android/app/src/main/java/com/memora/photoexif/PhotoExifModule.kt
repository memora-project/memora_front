package com.memora.photoexif

import android.app.Activity
import android.content.Intent
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Picks an image from the user's gallery and reads its EXIF including GPS,
 * bypassing Android 10+'s automatic location redaction.
 *
 * On Android 10+, ContentResolver.openInputStream() strips GPS metadata
 * unless the URI is wrapped with MediaStore.setRequireOriginal(). The standard
 * react-native-image-picker / image-crop-picker libraries do not do this
 * during their copy-to-cache step, so EXIF GPS is lost.
 *
 * This module:
 *   1. Launches Intent.ACTION_PICK against MediaStore (legacy gallery picker,
 *      not the privacy-aware ACTION_PICK_IMAGES which strips GPS by design).
 *   2. Wraps the returned content URI with setRequireOriginal().
 *   3. Reads ExifInterface directly from that stream so GPS survives.
 *
 * Requires `ACCESS_MEDIA_LOCATION` permission to be granted at runtime.
 */
class PhotoExifModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var pendingPromise: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun pickImageWithExif(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("E_NO_ACTIVITY", "No current Activity available")
            return
        }
        if (pendingPromise != null) {
            promise.reject("E_PICKER_BUSY", "A pick is already in progress")
            return
        }
        pendingPromise = promise

        try {
            // ACTION_PICK against MediaStore explicitly opens the legacy gallery,
            // not the new privacy-stripping ACTION_PICK_IMAGES photo picker.
            val intent = Intent(
                Intent.ACTION_PICK,
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            )
            activity.startActivityForResult(intent, REQUEST_CODE)
        } catch (e: Exception) {
            pendingPromise = null
            promise.reject("E_LAUNCH_FAIL", e.message ?: "Failed to launch picker", e)
        }
    }

    override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
    ) {
        if (requestCode != REQUEST_CODE) return
        val promise = pendingPromise ?: return
        pendingPromise = null

        if (resultCode != Activity.RESULT_OK) {
            promise.reject("E_PICKER_CANCELLED", "User cancelled the picker")
            return
        }
        val pickedUri: Uri? = data?.data
        if (pickedUri == null) {
            promise.reject("E_NO_URI", "Picker returned no URI")
            return
        }

        try {
            // 1순위: setRequireOriginal로 GPS 살린 채 읽기 시도
            promise.resolve(readExif(pickedUri, requireOriginal = true))
        } catch (e: SecurityException) {
            // ACCESS_MEDIA_LOCATION이 실제로 OS에 부여되지 않은 경우.
            // GPS는 포기하고 사진/시간만이라도 정상 반환 → JS의 디바이스 GPS fallback이 받음.
            try {
                promise.resolve(readExif(pickedUri, requireOriginal = false))
            } catch (inner: Exception) {
                promise.reject("E_EXIF_FAIL", inner.message ?: "EXIF read failed", inner)
            }
        } catch (e: Exception) {
            promise.reject("E_EXIF_FAIL", e.message ?: "EXIF read failed", e)
        }
    }

    override fun onNewIntent(intent: Intent) {
        // no-op
    }

    private fun readExif(
        pickedUri: Uri,
        requireOriginal: Boolean,
    ): com.facebook.react.bridge.WritableMap {
        // requireOriginal=true이면 setRequireOriginal로 wrap → GPS 살아있는 원본 스트림 요청
        // (단, 이 경우 ACCESS_MEDIA_LOCATION이 OS에 실제 부여돼 있지 않으면 SecurityException 발생)
        val originalUri: Uri =
            if (requireOriginal && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    MediaStore.setRequireOriginal(pickedUri)
                } catch (_: Exception) {
                    // Non-MediaStore URIs (e.g. SAF) can't be wrapped; fall back.
                    pickedUri
                }
            } else {
                pickedUri
            }

        val resolver = reactApplicationContext.contentResolver
        val pfd =
            resolver.openFileDescriptor(originalUri, "r")
                ?: throw IllegalStateException("Cannot open file descriptor for $originalUri")

        pfd.use { descriptor ->
            // FileDescriptor constructor avoids known InputStream-related bugs
            // in android.media.ExifInterface for content URIs.
            val exif = ExifInterface(descriptor.fileDescriptor)

            val latLng = FloatArray(2)
            val hasLatLng = exif.getLatLong(latLng)

            val takenAt: String? =
                exif.getAttribute(ExifInterface.TAG_DATETIME_ORIGINAL)
                    ?: exif.getAttribute(ExifInterface.TAG_DATETIME)

            val result = Arguments.createMap()
            // Return the picker URI for display; RN <Image> can render content:// URIs.
            result.putString("uri", pickedUri.toString())
            if (takenAt != null) result.putString("takenAt", takenAt) else result.putNull("takenAt")
            if (hasLatLng) {
                result.putDouble("latitude", latLng[0].toDouble())
                result.putDouble("longitude", latLng[1].toDouble())
            } else {
                result.putNull("latitude")
                result.putNull("longitude")
            }
            return result
        }
    }

    companion object {
        const val NAME = "PhotoExifModule"
        private const val REQUEST_CODE = 0xE71F // arbitrary; just unique to this module
    }
}
