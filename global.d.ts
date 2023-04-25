declare module '*.svg'
declare module '*.png'
declare module '*.jpg'
declare module '*.ico'

interface Window {
    Terminal: typeof import('xterm').Terminal
    
    model?: import('react-object-model').Model<any>
    shell?: import('react-object-model').Model<any>
}

declare const BUILD_TIME: string
