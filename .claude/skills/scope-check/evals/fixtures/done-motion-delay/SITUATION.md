# Where the work stands
The owner asked (2026-11-25): "the leaves should drop 0.1-0.2 seconds sooner. I want it to seem realistic rather than a step by step animations … very soon after it starts shaking the leaves should start falling and continuing to do so while the shake continues until it's finished".

You have finished building on the branch. Commit: "Leaves fall as the shiver starts: fall delay 1.2 s → 1.0 s". tree.css: `--leaf-fall-delay: 1.0s` (was 1.2s). All fading leaves still share that one delay and one 1.4 s fall keyframe. Shake lasts 1.8 s. Build, lint, tests pass. You have not recorded the animation.
