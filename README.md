# InstaTube Downloader

Build a modern premium web dashboard called "MediaFlow" for downloading user-authorized online media.
Core concept
The user pastes a public media URL into a large URL input field and the dashboard analyzes the URL. For supported and authorized content, show available download formats and quality options.
Supported sources
Design the UI to recognize:
YouTube
Instagram
Other supported public media URLs
Do NOT design functionality for bypassing DRM, private content restrictions, authentication, paywalls, or platform download restrictions.
Main dashboard
Create a beautiful dark premium interface with:
Top navigation
MediaFlow logo
Dashboard
Downloads
History
Settings
User avatar
Hero section
Heading: "Download your media."
Subheading: "Paste an authorized media URL and choose your preferred format and quality."
Large URL input:
"Paste YouTube or Instagram URL..."
Primary button:
"Analyze URL"
Paste icon/button inside the input
After URL analysis
Display a media preview card containing:
Thumbnail
Video title
Creator/channel
Duration
Source badge
File size estimate
Format selector
Create a clean segmented control:
Video
Audio
Video + Audio
Quality selector
Show:
144p
240p
360p
480p
720p HD
1080p Full HD
Only display qualities actually available for the authorized source.
Download section
Show:
Selected format
Selected quality
Estimated file size
Download button
Progress bar while downloading
Download completed state
Recent downloads
Create a table/card list with:
Thumbnail
Title
Format
Quality
File size
Date
Download again button
Premium UX
Use:
Dark charcoal background
Glassmorphism cards
Subtle gradients
Rounded 16–20px corners
Clean modern typography
Smooth hover animations
Skeleton loading states
Toast notifications
Responsive mobile/tablet/desktop layout
Do NOT overcrowd the interface.
Empty state
Before a URL is entered, show an attractive empty state with:
"Paste a URL above to get started."
Error states
Design friendly error messages for:
Invalid URL
Unsupported source
Media unavailable
Download unavailable
Network error
Example:
"We couldn't process this URL. Check that it's a supported public URL and that you have permission to download the content."
Technical architecture
Build the frontend with a clean component architecture and prepare the application for a backend API.
Create API abstraction functions such as:
analyzeMedia(url)
getAvailableFormats(mediaId)
startDownload(mediaId, format)
getDownloadStatus(jobId)
getDownloadHistory()
Do not put downloader/API secrets in frontend code.
Use mock API responses initially so the complete dashboard can be demonstrated without a real media-processing backend.
Make the application production-quality, responsive, accessible, and visually polished.


bro one more request it sholud look like you are dashboard is related to youtube and insta reel url 

so dont try to make it stock webiste it should give hints of youtube and isnta so choose color of both and make it look good clean and sexi

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4db0bfca-cfa6-421f-9d68-cb134022217b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
