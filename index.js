var outputFileName;

function ReactIntlPlugin(options) {
  outputFileName =
    options.outputFileName == null ? "en_US.json" : options.outputFileName;
}

ReactIntlPlugin.prototype.apply = function(compiler) {
  var messages = {};
  var finalMessages = {};

  compiler.hooks.compilation.tap("ReactIntlPlugin", function(compilation) {
    // console.log("The compiler is starting a new compilation...");

    compilation.hooks.normalModuleLoader.tap("ReactIntlPlugin", function(
      context,
      module
    ) {
      // console.log("registering function: ", __dirname, "in loader context");
      context["metadataReactIntlPlugin"] = function(metadata) {
        // do something with metadata and module
        // console.log("module:",module,"collecting metadata:", metadata);
        messages[module.resource] =
          (metadata["react-intl"] || {}).messages || "";
      };
    });
  });

  compiler.hooks.emit.tapAsync("ReactIntlPlugin", function(
    compilation,
    callback
  ) {
    // console.log("emitting messages");
    // console.log(messages);

    // check for duplicates and flatten
    var jsonMessages = [];
    var idIndex = {};
    Object.keys(messages).map(function(e) {
      (messages[e] || []).map(function(m) {
        if (!idIndex[m.id]) {
          idIndex[m.id] = e;
          jsonMessages.push(m);

          // add default language
          finalMessages[m.id] = m.defaultMessage;
        } else {
          compilation.errors.push(
            "ReactIntlPlugin -> duplicate id: '" +
              m.id +
              "'.Found in '" +
              idIndex[m.id] +
              "' and '" +
              e +
              "'."
          );
        }
      });
    });

    // order jsonString based on id (since files are under version control this makes changes easier visible)
    jsonMessages.sort(function(a, b) {
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    finalMessages = sortObject(finalMessages);

    var jsonString = JSON.stringify(jsonMessages, undefined, 2);
    var finalMessagesString = JSON.stringify(finalMessages, undefined, 2);

    // console.log("jsonString:",jsonString);
    // console.log(finalMessages)

    // save default translation
    compilation.assets[outputFileName] = {
      source: function() {
        return finalMessagesString;
      },
      size: function() {
        return 13;
      }
    };

    // save messages to translate
    compilation.assets["translateMe.json"] = {
      source: function() {
        return jsonString;
      },
      size: function() {
        return jsonString.length;
      }
    };

    callback();
  });
};

function sortObject(o) {
  return Object.keys(o)
    .sort()
    .reduce((r, k) => ((r[k] = o[k]), r), {});
}

module.exports = ReactIntlPlugin;
module.exports.metadataContextFunctionName = "metadataReactIntlPlugin";
