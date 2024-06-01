# Vircadia World

This project must be small (fewer lines of code, though no code golf). The scale MUST be balanced: more complexity = less lines of code to allow for that, OR if you want more lines of code, it must be less complex by an order of magnitude, but even then the lines of code must be minimal.

Stack:

1. Node.js (runtime)
1. tRPC with Express (router)

## Install

To get started, clone the repository and install the dependencies:

```sh
npm install
```

## Develop

To run all apps and packages in development mode, run the following command:

```sh
npm run dev
```

## Architecture

Simulation of worlds is split into two layers, first is the surface (Metaphysical) and then the foundation (Physical). Traditional games and software follow metaphysical forces where they create the direct idea of something (e.g. a gun or a car, or "a script which will move this planet from A to B when the update starts") and then try to add physical complexity through the top down approach.

### Metaphysical

The **metaphysical simulation layer** allows for development of scripts and functionality of the world in the traditional methods since computing was invented.

### Physical

The **physical simulation layer** is constantly applying increased complexity to it as we are able to simulate forces better and better to create "worlds" that follow different physical laws, predefined.
