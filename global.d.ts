declare module '*.icon.svg' {
    const component: React.ComponentType<React.SVGProps<SVGSVGElement>>
    export default component
}

declare module '*.svg' {
    const text: string
    export default text
}

declare module '*.png' {
    const text: string
    export default text
}

declare module '*.jpg' {
    const text: string
    export default text
}

declare module '*.ico' {
    const text: string
    export default text
}

declare module '*.csv' {
    const text: string
    export default text
}

declare module '*.txt' {
    const text: string
    export default text
}

declare module '*.dos' {
    const text: string
    export default text
}

declare module '*.sass' {
    const classes: { readonly [key: string]: string }
    export default classes
}

interface Window {
    model?: import('react-object-model').Model<any>
    shell?: import('react-object-model').Model<any>
    dashboard?: import('react-object-model').Model<any>
}

declare const WEB_VERSION: string
