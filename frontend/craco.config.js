module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      if (Array.isArray(webpackConfig.entry)) {
        webpackConfig.entry = webpackConfig.entry.filter(
          (e) => !e.includes('webpack/hot/dev-server')
        );
      } else if (typeof webpackConfig.entry === 'object') {
        Object.keys(webpackConfig.entry).forEach((key) => {
          if (Array.isArray(webpackConfig.entry[key])) {
            webpackConfig.entry[key] = webpackConfig.entry[key].filter(
              (e) => !e.includes('webpack/hot/dev-server')
            );
          }
        });
      }
      return webpackConfig;
    }
  },
  devServer: {
    hot: false
  }
};