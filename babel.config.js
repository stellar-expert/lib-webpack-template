module.exports = function createBabelConfig(additionalPlugins = []) {
    return function (api) {
        api.cache(true)
        return {
            presets: [
                [
                    '@babel/preset-env',
                    {
                        corejs: '3.35',
                        useBuiltIns: 'entry',
                        //modules: false,
                        targets: {
                            browsers: [
                                '> 2%',
                                'not dead',
                                'not op_mini all'
                            ],
                            node: '18'
                        }
                    }
                ]
            ],
            plugins: [
                ...additionalPlugins
            ]
        }
    }
}