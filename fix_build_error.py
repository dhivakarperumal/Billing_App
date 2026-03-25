import zipfile
import glob
import os

# Find all 0.84.1 react-android AARs
aars = glob.glob(r"C:\Users\dhiva\.gradle\caches\**\react-android\0.84.1\**\react-android-0.84.1-debug.aar", recursive=True)
target_file = "prefab/modules/reactnative/include/react/renderer/core/graphicsConversions.h"

for aar_path in aars:
    print(f"Checking AAR: {aar_path}")
    temp_aar_path = aar_path + ".tmp"
    patched = False
    
    try:
        with zipfile.ZipFile(aar_path, 'r') as zin, zipfile.ZipFile(temp_aar_path, 'w') as zout:
            for item in zin.infolist():
                content = zin.read(item.filename)
                if item.filename == target_file:
                    if b'std::format("{}%", dimension.value)' in content:
                        print(f"  Found pattern in {aar_path}. Patching...")
                        content = content.replace(b'std::format("{}%", dimension.value)', b'std::to_string(dimension.value) + "%"')
                        patched = True
                    else:
                        print(f"  Pattern NOT found in {aar_path} (maybe already patched or uses different pattern)")
                zout.writestr(item, content)
        
        if patched:
            os.replace(temp_aar_path, aar_path)
            print(f"  AAR {aar_path} patched successfully.")
        else:
            os.remove(temp_aar_path)
    except Exception as e:
        print(f"  Error processing {aar_path}: {e}")

# Also find and patch transformed files
print("\nChecking transforms...")
transforms = glob.glob(r"C:\Users\dhiva\.gradle\caches\**\transforms\**\react-android-0.84.1-debug\**\graphicsConversions.h", recursive=True)
for header in transforms:
    print(f"Checking header: {header}")
    try:
        with open(header, 'rb') as f:
            content = f.read()
        if b'std::format("{}%", dimension.value)' in content:
            print(f"  Patching {header}...")
            content = content.replace(b'std::format("{}%", dimension.value)', b'std::to_string(dimension.value) + "%"')
            with open(header, 'wb') as f:
                f.write(content)
        else:
            print(f"  Pattern NOT found in {header}")
    except Exception as e:
        print(f"  Error processing {header}: {e}")
