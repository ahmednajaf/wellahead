# User-supplied Anatomy Atelier models

Copied byte-for-byte from Ahmed’s Downloads folder. Source files were not edited.
These are reference illustrations, not patient scans. Ownership/licence terms are
not embedded in the GLBs; retain the original acquisition/licence records before redistribution.
Existing model sources and licence notices elsewhere in the repository are retained.

The React organ viewer loads these GLBs on demand using the existing Three.js r180
GLTFLoader and the matching official Meshopt decoder. The canvas fallback renders
the same decoded geometry and base-colour texture with simplified lighting.
Rob’s whole-body, knee and reproductive viewers are unchanged.

Decoder source: https://github.com/mrdoob/three.js/blob/r180/examples/jsm/libs/meshopt_decoder.module.js
Loader documentation: https://threejs.org/docs/pages/GLTFLoader.html

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| heart.glb | 3321148 | `ef48b43442dbbe2819d6035f8bbf1391d2c3fefbe842863c9c7c1a22cc6cd748` |
| brain.glb | 2570592 | `2cd5e7178f1e5de707bb97c2c06f6c34fb5aaad28132445c0afcb4f0fd67c811` |
| lungs.glb | 4455976 | `81617c9fc2f2b7bf1e7d874b89614c89b09f2f68318e64997c68c948cfa9abdc` |
| pancreas.glb | 4848556 | `e5213bf8ed66e8ed4eb2a9d1c7a6922fb926eac85de8c5979e780ca1abcaf1c3` |
| intestine.glb | 1980780 | `d4423ba0c8f08ac7652396e2530482f874e4964a9c3f1b71440f0493048bea26` |
| kidneys.glb | 2190764 | `e3e0a58372d794d68b181d1d453ff4362da972667c28711e153c5f34064cf165` |
| liver.glb | 2660384 | `e4f11a9c0762eb9dc4309dcd0d5c3e3958ccacab915267da4e7775894b674990` |
| eyeball.glb | 2203616 | `584337a2efc7d3c03d7326ca930217c4f7e5eca0a32a8cec141c7388ecc8a1c7` |
| skin.glb | 5789160 | `8183ffe3527b3f071c41c55e41ffaf673df8d02a1405e95e644ac5d89cd6f5f9` |
