# Publishing a release

For maintainers. A release puts the same version on GitHub, npm, the CDNs and the demo.

## 1. Prepare

1. Set the new version everywhere: `package.json`, `pyproject.toml`, the UFO's `fontinfo.plist` (`versionMajor`, `versionMinor`, `openTypeNameVersion`, `openTypeNameUniqueID`), the comment at the top of `css/alawonn.css`, the README's CDN links, and a new entry at the top of `FONTLOG.md`. `1.2.3` is `Version 1.023` inside the font.
2. Rebuild and run every check:

   ```bash
   npm run build
   npm test
   npm run consumers
   npm run demo:build
   npm run demo:test
   ```

3. Open a pull request. Merge it into `main` once CI passes.

## 2. Tag and release on GitHub

From the merged `main`:

```bash
git switch main && git pull
git tag -s v1.2.3 -m "Alawonn Font v1.2.3"
git push origin v1.2.3
```

Pushing the tag runs `.github/workflows/release.yml`. It rebuilds the fonts, checks they match the tagged `dist/`, packs the npm tarball, and creates the GitHub Release with:

- `Alawonn-Regular.ttf` and `Alawonn-Regular.woff2`
- `alawonn-font-1.2.3.zip` (both fonts, `OFL.txt`, `TRADEMARKS.md`, `FONTLOG.md`, `README.md`)
- `alawonn-font-1.2.3.tgz` (the npm package)
- `SHA256SUMS` for all of the above

## 3. Publish to npm

Publish the tarball attached to the release, so npm gets the exact bytes that were checked:

```bash
gh release download v1.2.3 --pattern 'alawonn-font-1.2.3.tgz' --pattern SHA256SUMS
sha256sum --check --ignore-missing SHA256SUMS
npm publish alawonn-font-1.2.3.tgz --access public
```

Then check from a machine that isn't logged in to npm:

```bash
npm view alawonn-font@1.2.3 dist.integrity
npm view alawonn-font dist-tags.latest
```

Never publish a prerelease to `latest`. Use `npm publish --tag next` for one.

## 4. Check the CDNs and the demo

```bash
curl -sI https://cdn.jsdelivr.net/npm/alawonn-font@1.2.3/css/alawonn.css
curl -sI https://cdn.jsdelivr.net/npm/alawonn-font@1.2.3/dist/Alawonn-Regular.woff2
curl -sI https://unpkg.com/alawonn-font@1.2.3/css/alawonn.css
curl -sI https://unpkg.com/alawonn-font@1.2.3/dist/Alawonn-Regular.woff2
```

Each should answer `200` with `text/css` or `font/woff2` and `access-control-allow-origin: *`. The demo at https://alawonn.github.io/alawonn-font/ deploys from `main` and shows the new version in its footer.
