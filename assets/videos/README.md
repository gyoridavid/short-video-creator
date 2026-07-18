# Local video provider

Drop your own background video clips in this folder (`.mp4`, `.mov`, `.webm`, or `.m4v`) to use them as a
video source, with or without any of the stock API keys configured.

- Files are matched to a scene's search terms by filename (case-insensitive substring match), e.g.
  `city-skyline-night.mp4` will match the search term `city`. If nothing matches, a random file is used.
- Set `VIDEO_PROVIDER=local` to make this the primary source, or leave it as a fallback - it's always
  tried last if the other configured providers fail.
- Change the folder location with the `LOCAL_VIDEOS_DIR` environment variable.
