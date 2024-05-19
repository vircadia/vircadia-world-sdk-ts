# Vircadia Worlds

This project must be small (fewer lines of code, though no code golf). The scale MUST be balanced: more complexity = less lines of code to allow for that, OR if you want more lines of code, it must be less complex by an order of magnitude, but even then the lines of code must be minimal.

Stack:
1. Bun.sh (runtime) 
2. Fastify (router)

## Rail

The Rail is the core code found in this repository. It consists of a high-performance realtime rail of workers that requests pass through. It's designed to run from Bun.sh, with each script running through a web worker.

Projects would be structured like this:

1. Clone `Pantheon`, comes preloaded with core workers
   - Plugin: Simulation via Babylon.js (headless) (import and export scenes via glTF)
   - Plugin: Storage via Git
   - Plugin: Networking via WebTransport
   - Plugin: Monitoring by Prometheus Export, hosted Grafana
2. Add own workers, configure as needed.

