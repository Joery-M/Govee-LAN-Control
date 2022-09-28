declare module "color-temperature"
{
    export function colorTemperature2rgbUsingTH (kelvin: number): rgb;
    export function colorTemperature2rgb (kelvin: number): rgb;
    export function rgb2colorTemperature (rgb: rgb): number;

    interface rgb
    {
        red: number,
        green: number,
        blue: number;
    }
}