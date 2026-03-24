import zipfile
import os

aar_path = r"C:\Users\dhiva\.gradle\caches\modules-2\files-2.1\com.facebook.react\react-android\0.84.1\b29b555d9f91f56ffd4624cc197eb661a730e97b\react-android-0.84.1-debug.aar"
temp_aar_path = aar_path + ".tmp"
target_file = "prefab/modules/reactnative/include/react/renderer/core/graphicsConversions.h"

with zipfile.ZipFile(aar_path, 'r') as zin, zipfile.ZipFile(temp_aar_path, 'w') as zout:
    for item in zin.infolist():
        content = zin.read(item.filename)
        if item.filename == target_file:
            content = content.replace(b'std::format("{}%", dimension.value)', b'std::to_string(dimension.value) + "%"')
            print("Successfully patched", target_file)
        zout.writestr(item, content)

os.replace(temp_aar_path, aar_path)
print("AAR replaced successfully")
