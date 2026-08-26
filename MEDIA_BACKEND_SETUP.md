# MediaFlow local media backend

The UI stays unchanged. The app now uses real server routes backed by `yt-dlp` and FFmpeg.

## Kali Linux prerequisites

```bash
sudo apt update
sudo apt install -y ffmpeg python3-pip
python3 -m pip install -U --user yt-dlp
```

If Kali blocks system-wide pip installs, use a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -U yt-dlp
```

Then start the app with the same Python environment active.

## Run

```bash
npm install
npm run dev
```

The downloader is intended for public, user-authorized media only. It does not bypass DRM, private content, login restrictions, or access controls.

## Long YouTube videos

The download worker allows up to 60 minutes, retries fragments, uses fresh yt-dlp URLs at download time, and streams the completed file instead of loading the entire file into a Node `Buffer`.

For video+audio, yt-dlp selects separate video/audio streams and uses FFmpeg to merge them into MP4 when required.
