import zipfile

aar_path = r"C:\Users\dhiva\.gradle\caches\modules-2\files-2.1\com.facebook.react\react-android\0.84.1\b29b555d9f91f56ffd4624cc197eb661a730e97b\react-android-0.84.1-debug.aar"
target_file = "prefab/modules/reactnative/include/react/renderer/core/graphicsConversions.h"

with zipfile.ZipFile(aar_path, 'r') as zin:
    if target_file in zin.namelist():
        content = zin.read(target_file).decode('utf-8')
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'std::format' in line or 'to_string' in line:
                print(f"{i+1}: {line}")
    else:
        print(f"File {target_file} not found in AAR")
