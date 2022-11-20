import { defineConfig, build } from 'tsup';
import * as fs from "fs";
import path from 'path';
import * as cp from 'child_process';

export default defineConfig({
    entry: ['src/index.ts'],
    clean: true,
    dts: true,
    sourcemap: true,
    format: ['cjs', 'esm'],
    external: ["color-convert", "color-temperature"],
    onSuccess: async () =>
    {
        //? Build all the ts files and pop em in the dist/node-red folder
        //* Bundling is disabled to be able to use html and other stuff
        var fileArray = []
        var files = fs.readdirSync("./src/node-red/").filter((val)=> val.endsWith(".ts"))
        files.forEach((file)=>{
            fileArray.push("./src/node-red/" + file)
        })
        await build({
            entry: fileArray,
            clean: true,
            skipNodeModulesBundle: true,
            outDir: "dist/node-red",
            config: false,
            bundle: false,
            tsconfig: "./tsconfig.red.json"
        }).catch((reason) =>
        {
            console.log(reason);
        });

        //? Get all HTML files and copy them to the same folder
        var HTMLfiles = fs.readdirSync("./src/node-red/html/").filter((file)=> file.endsWith(".html"))
        HTMLfiles.forEach((htmlFile)=>{
            fs.copyFileSync("./src/node-red/html/" + htmlFile, "./dist/node-red/" + htmlFile)
        })


        //* Copy the icons folder
        //? Could not use fs, bc of "operation not permitted"

        
        // copyFolderRecursiveSync("./src/node-red/html/assets", "./dist/node-red/")
        if (!fs.existsSync("./dist/node-red/icons")) {
            fs.mkdirSync("./dist/node-red/icons")
        }
        cp.exec(`xcopy "${fs.realpathSync("./src/node-red/html/icons").replaceAll("\\", "/")}" "${fs.realpathSync("./dist/node-red/icons").replaceAll("\\", "/")}" /K /D /H /Y`)
        .on("message", console.log)
        .on("error", console.error)


        // Copy the dgramTest.js
        fs.copyFileSync("./src/dgramTest.js", "./dist/dgramTest.js")
    }
});



//* https://stackoverflow.com/a/26038979
// function copyFolderRecursiveSync( source, target ) {
//     var files = [];

//     // Check if folder needs to be created or integrated
//     var targetFolder = path.join( target, path.basename( source ) );
//     if ( !fs.existsSync( targetFolder ) ) {
//         fs.mkdirSync( targetFolder );
//     }

//     // Copy
//     if ( fs.lstatSync( source ).isDirectory() ) {
//         files = fs.readdirSync( source );
//         files.forEach( function ( file ) {
//             var curSource = path.join( source, file );
//             if ( fs.lstatSync( curSource ).isDirectory() ) {
//                 copyFolderRecursiveSync( curSource, targetFolder );
//             } else {
//                 fs.copyFileSync( curSource, targetFolder );
//             }
//         } );
//     }
// }