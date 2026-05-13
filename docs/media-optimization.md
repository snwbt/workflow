# Media Optimization Workflow

Use this before launch, or after adding large local images to `public/media`.

```powershell
npm.cmd run optimize:media
```

To optimize specific files only:

```powershell
npm.cmd run optimize:media -- image-one.jpg image-two.png
```

The script keeps the original file and writes a same-name `.webp` beside it. After optimization, update the CMS/default image URL to the `.webp` asset for gallery and below-the-fold imagery.
