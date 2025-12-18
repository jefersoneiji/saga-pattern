import { defineConfig } from '@rspack/cli';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const file_path = fileURLToPath(import.meta.url);
const current_dir = dirname(file_path);

export default defineConfig({
    entry: { main: './listeners.ts' },
    output: { path: current_dir + '/dist' },
    externals: { 'pg-native': 'commonjs pg-native' },
    resolve: {
        extensions: ['.ts', '.js']
    },
    target: 'node',
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: [/node_modules/],
                loader: 'builtin:swc-loader',
                options: {
                    jsc: {
                        parser: {
                            syntax: 'typescript',
                        },
                    },
                },
                type: 'javascript/auto',
            },
        ],
    },
});