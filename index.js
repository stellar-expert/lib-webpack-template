const path = require('node:path')
const webpack = require('webpack')
const createBabelConfig = require('./babel.config')

const defaultProjectRoot = process.cwd()

class WebpackConfigBuilder {
    /**
     * @param {WebpackBuilderParams} params
     * @constructor
     */
    constructor(params) {
        this.params = { //apply default params
            define: {},
            projectRoot: defaultProjectRoot,
            outputPath: './lib',
            gatherBundleStats: false,
            ...params
        }
        this.params.outputPath = this.ensureAbsolutePath(this.params.outputPath)
        Object.freeze(this.params)
    }

    /**
     * @type {WebpackBuilderParams}
     */
    params

    /**
     * @type {{}[]}
     * @private
     */
    plugins

    /**
     * @type {'development'|'production'}
     */
    mode

    get isProduction() {
        return this.mode !== 'development'
    }

    build(env, argv) {
        const mode = this.mode = argv.mode || 'development'
        process.env.NODE_ENV = mode
        console.log('Building webpack project ' + this.params.projectRoot)
        console.log('mode=' + mode)

        //plugins
        this.plugins = []
        this.initProvidePlugin()
        this.initIgnorePlugin()
        this.initLoaderOptionsPlugin()
        this.initDefinePlugin()
        this.initBundleAnalyzerPlugin()

        const res = {
            mode,
            entry: this.prepareEntry(),
            output: this.prepareOutput(),
            module: {
                rules: this.prepareModuleRules(),
                noParse: /\.wasm$/
            },
            plugins: this.plugins,
            externals: this.prepareExternals(),
            resolve: this.prepareResolveSection(),
            resolveLoader: {
                modules: ['node_modules', path.resolve(__dirname, 'node_modules')]
            },
            optimization: {
                moduleIds: 'deterministic',
                minimizer: this.prepareMinimizerSection()
            },
            devtool: this.prepareSourceMapSection()
        }
        return res
    }

    /**
     * @private
     */
    ensureAbsolutePath(value) {
        return path.isAbsolute(value) ?
            value :
            path.resolve(this.params.projectRoot, value)
    }

    /**
     * @private
     */
    prepareModuleRules() {
        return [
            {
                test: /\.js?$/,
                loader: 'babel-loader'
            },
            {
                test: /\.wasm$/,
                loader: 'base64-loader',
                type: 'javascript/auto'
            }
        ]
    }

    prepareExternals() {
        const res = {
            '@stellar/stellar-sdk': '@stellar/stellar-sdk',
            '@stellar/stellar-base': '@stellar/stellar-base'
        }
        if (this.params.externals) {
            Object.assign(res, this.params.externals)
        }
        return res
    }

    /**
     * @private
     */
    prepareMinimizerSection() {
        if (!this.isProduction)
            return
        const TerserPlugin = require('terser-webpack-plugin')
        return [
            new TerserPlugin({
                terserOptions: {
                    //warnings: true,
                    toplevel: true
                }
            })
        ]
    }

    /**
     * @private
     */
    prepareEntry() {
        const {libName, inputPath} = this.params
        if (!libName || !inputPath)
            throw new Error('No entries to process')
        return {[libName]: this.ensureAbsolutePath(inputPath)}
    }

    /**
     * @private
     */
    prepareOutput() {
        const {libName, outputPath, globalObject = 'globalThis', entry, library} = this.params
        const libProps = Object.assign({
            name: libName,
            type: 'umd2',
            export: 'default'
        }, library)
        return {
            path: this.ensureAbsolutePath(outputPath),
            filename: '[name].js',
            library: libProps,
            globalObject,
            clean: true
        }
    }

    /**
     * @private
     */
    prepareSourceMapSection() {
        if (this.params.sourcemap)
            return 'source-map'
    }

    /**
     * @private
     */
    initIgnorePlugin() {
        const {ignoreCallback} = this.params
        if (ignoreCallback) {
            this.plugins.push(new webpack.IgnorePlugin({
                checkResource(resource, context) {
                    if (ignoreCallback && ignoreCallback(resource, context))
                        return true
                    return false
                }
            }))
        }
    }

    /**
     * @private
     */
    initProvidePlugin() {
        this.plugins.push(new webpack.ProvidePlugin({Buffer: ['buffer', 'Buffer']}))
    }

    /**
     * @private
     */
    initLoaderOptionsPlugin() {
        this.plugins.unshift(new webpack.LoaderOptionsPlugin({
            minimize: !!this.isProduction,
            debug: false,
            sourceMap: this.params.sourcemap
        }))
    }

    /**
     * @private
     */
    initDefinePlugin() {
        const {define = {}} = this.params
        const vars = {'process.env.NODE_ENV': JSON.stringify(this.mode)}
        for (const [key, value] of Object.entries(define)) {
            vars[key] = JSON.stringify(value)
        }
        this.plugins.push(new webpack.DefinePlugin(vars))
    }

    /**
     * @private
     */
    initBundleAnalyzerPlugin() {
        if (!this.params.gatherBundleStats)
            return
        const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
        this.plugins.push(new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: 'bundle-stats.html',
            openAnalyzer: false
        }))

        try { //optional duplicates analysis
            const inspectpack = require('inspectpack/plugin')
            if (!inspectpack) return
            this.plugins.push(new inspectpack.DuplicatesPlugin({
                emitErrors: false,
                ignoredPackages: []
            }))
        } catch (e) {
        }
    }

    /**
     * @private
     */
    prepareResolveSection() {
        return {
            symlinks: true, //important for PNPM
            modules: [path.resolve(this.params.projectRoot, 'node_modules'), 'node_modules'],
            fallback: {
                util: false,
                http: false,
                https: false,
                path: false,
                fs: false,
                url: false,
                events: require.resolve('events'),
                buffer: require.resolve('buffer/'),
                stream: require.resolve('stream-browserify')
            }
        }
    }
}

/**
 * Init webpack configuration function
 * @param {WebpackBuilderParams} params
 * @return {Function}
 */
function initLibWebpackConfig(params) {
    const builder = new WebpackConfigBuilder(params)
    return builder.build.bind(builder)
}

module.exports = {initLibWebpackConfig, createBabelConfig}

/**
 * @typedef {{}} WebpackBuilderParams
 * @property {String} libName - Library name (in camelCase)
 * @property {String} inputPath - Input file path ('./index.js' by default)
 * @property {String} outputPath - Output base path (relative or absolute path)
 * @property {String} [projectRoot] - Project root directory
 * @property {LibraryProps} [library] - Library properties (default value is {type: 'umd2', export: 'default'})
 * @property {{}} [define] - Additional variables to be defined in the execution scope
 * @property {{}} [externals] - External libraries that should be excluded from the bundle
 * @property {Boolean} [sourcemap] - Generate source map (always generate by default)
 * @property {String} [globalObject] - Global object reference (globalThis by default)
 * @property {Function} [ignoreCallback] - Callback to use for ignoring packages bundled to the output
 * @property {Boolean} [gatherBundleStats] - Generate bundle stats report on production builds
 */

/**
 * @typedef {{}} LibraryProps
 * @property {String} [name] - Library output variable name (if omitted, entry[0] is used)
 * @property {String} [type] - Library target ('umd2' by default)
 * @property {String} [export] - Name of the default export ('default' by default)
 */