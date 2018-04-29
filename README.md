# radio-playlist-generator

Script that fetches metadata from a radio and downloads the corresponding MP3's from Youtube.
I am not a lawyer. Please check that this program is legal in your jurisdiction before running it.

## Installation
```
npm install
wget https://yt-dl.org/downloads/latest/youtube-dl
```

## Usage

To get the list of supported radios:
```
node index.js
```

To watch for metadata changes, and download every new song in the `musics` folder:
```
node index.js "Virgin Radio France"
```

## License

AGPL-3.0
