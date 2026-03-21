# 아이콘 파일 교체 가이드

이 디렉토리(`build/`)는 electron-builder가 앱 아이콘을 읽는 위치입니다.

## 필요한 파일

| 파일명       | 크기     | 용도           |
|------------|---------|--------------|
| `icon.png`  | 512×512 | Linux + 기본   |
| `icon.ico`  | 256×256 | Windows 전용   |
| `icon.icns` | 512×512 | macOS 전용     |

## 변환 방법

`icon.svg` 또는 `icon.png`에서 각 포맷으로 변환:

```bash
# PNG → ICO (Windows)
# https://convertio.co 또는 ImageMagick:
# magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico

# PNG → ICNS (macOS)
# png2icns icon.icns icon.png
# 또는: iconutil -c icns icon.iconset/
```

## 온라인 변환 도구

- https://www.electron.build/icons — electron-builder 공식 안내
- https://cloudconvert.com — PNG/SVG → ICO, ICNS 변환

## 현재 상태

- `icon.svg` — 512×512 placeholder SVG (실제 배포 전 교체 필요)
- `icon.png` — 미생성 (SVG를 PNG로 변환하여 추가하세요)
- `icon.ico` — 미생성 (Windows 배포 전 추가하세요)
- `icon.icns` — 미생성 (macOS 배포 전 추가하세요)
