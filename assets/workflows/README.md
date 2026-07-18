# ComfyUI workflows

Drop ComfyUI "API format" workflow JSON files here (exported from the ComfyUI UI via
*Save (API Format)*) to use them with the image/video generation providers in
`src/image-providers` and `src/video-providers`.

Expected filenames, matched by provider:

- `sdxl.json` - used by the SDXL image provider
- `flux.json` - used by the FLUX image provider
- `animatediff.json` - used by the AnimateDiff video provider

Prompt text and character reference overrides (LoRA path, IP-Adapter image, etc.) are substituted into the
workflow's node inputs by node title - see `src/image-providers/comfyui.ts`.
