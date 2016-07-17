'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const xml2js = require('xml2js');
const procs = require('xml2js/lib/processors');

const folderZip = require('../common/folder-zip');

const URN_RELATIONSHIP_PACKAGE = 'urn:anavis:v1.0:packaging:relationship:package';
const URN_SOUND_VISUALIZATION_0_8 = 'urn:anavis:visualizations:soundvisualization:v0.8';
const URN_SOUND_VISUALIZATION_1_0 = 'urn:anavis:visualizations:soundvisualization:v1.0';
const URN_LYRICS_VISUALIZATION_0_8 = 'urn:anavis:visualizations:lyricsvisualization:v0.8';
const URN_LYRICS_VISUALIZATION_1_0 = 'urn:anavis:visualizations:lyricsvisualization:v1.0';
const URN_HARMONIES_VISUALIZATION_0_8 = 'urn:anavis:visualizations:harmoniesvisualization:v0.8';
const URN_HARMONIES_VISUALIZATION_1_0 = 'urn:anavis:visualizations:harmoniesvisualization:v1.0';
const URN_ANNOTATIONS_VISUALIZATION_0_8 = 'urn:anavis:visualizations:annotationsvisualization:v0.8';
const URN_ANNOTATIONS_VISUALIZATION_1_0 = 'urn:anavis:visualizations:annotationsvisualization:v1.0';

const processorOptions = {
  tagNameProcessors: [procs.stripPrefix, procs.firstCharLowerCase, procs.parseNumbers, procs.parseBooleans],
  attrNameProcessors: [procs.stripPrefix, procs.firstCharLowerCase, procs.parseNumbers, procs.parseBooleans],
  explicitRoot: false,
  emptyTag: null,
};

const inputZip = './Boogie.avd';
const packageDir = `./tmp-${Date.now()}`;

let docObj;
let docXml;
let docDir;
let docFile;
let docRelsFile;
let packageRelsFile;
let packageRelationships;
let documentRelationships;

start();

function start() {
  mkdirp(packageDir, function (err) {
    if (err) throw err;
    return unzip();
  });
}

function end() {
  console.log(docXml);
  console.log('------------------------------------------------------------------------------------------');
  console.dir(docObj, { depth: null, colors: true });
  console.log(JSON.stringify(docObj));
}

function unzip() {
  folderZip.unzip(inputZip, packageDir, function (err) {
    if (err) throw err;
    return recognizePackageRelsFile();
  });
}

function recognizePackageRelsFile() {
  packageRelsFile = path.join(packageDir, '_rels', '.rels');
  fs.stat(packageRelsFile, function (err, stats) {
    if (err) throw err;
    if (!stats.isFile()) throw new Error(`${packageRelsFile} is not a file!`);
    parsePackageRelsFile();
  });
}

function parsePackageRelsFile() {
  fs.readFile(packageRelsFile, function (err, xml) {
    if (err) throw err;
    xml2js.parseString(xml, processorOptions, function (err, result) {
      if (err) throw err;
      packageRelationships = mapRels(result);
      recognizeDocFile();
    });
  });
}

function mapRels(rels) {
  return rels.relationship.map(x => x.$);
}

function recognizeDocFile() {
  const docNode = packageRelationships.find(x => x.type === URN_RELATIONSHIP_PACKAGE);
  if (!docNode) throw new Error('Document path not found');
  docFile = path.join(packageDir, docNode.target);
  fs.stat(docFile, function (err, stats) {
    if (err) throw err;
    if (!stats.isFile()) throw new Error(`${docFile} is not a file!`);
    recognizeDocRelsFile();
  });
}

function recognizeDocRelsFile() {
  docRelsFile = path.join(path.dirname(docFile), '_rels', `${path.basename(docFile)}.rels`);
  fs.stat(docRelsFile, function (err, stats) {
    if (err && err.code !== 'ENOENT') throw err;
    if (stats && stats.isFile()) parseDocRelsFile();
    else parseDocFile(); // there are no relationships for the document
  });
}

function parseDocRelsFile() {
  fs.readFile(docRelsFile, function (err, xml) {
    if (err) throw err;
    xml2js.parseString(xml, processorOptions, function (err, result) {
      if (err) throw err;
      documentRelationships = mapRels(result);
      parseDocFile();
    });
  });
}

function parseDocFile() {
  fs.readFile(docFile, function (err, xml) {
    if (err) throw err;
    xml2js.parseString(xml, processorOptions, function (err, result) {
      if (err) throw err;
      docXml = xml.toString('utf8');
      docObj = mapDoc(result);
      end();
    });
  });
}

function mapDoc(doc) {
  return {
    work: mapWork(doc.work[0] || null),
    visualizations: (doc.visualizations || []).filter(x => x).map(x => x.visualization).reduce((x, y) => x.concat(y), []).map(x => mapVisualization(x)),
    resources: (doc.resources || []).filter(x => x).map(x => x.resourceList).reduce((x, y) => x.concat(y), []).map(x => mapResourceList(x))
  };
}

function mapWork(work) {
  if (!work) return null;
  return {
    properties: mapProperties(work.properties[0]),
    categories: mapCategories(work.categories[0]),
    parts: mapParts(work.parts[0])
  };
}

function mapProperties(properties) {
  if (!properties) return null;
  return properties.property.map(x => ({
    name: x.$.name,
    value: x.$.value
  }));
}

function mapCategories(categories) {
  if (!categories) return null;
  return categories.category.map(x => ({
    id: x.$.id,
    name: x.$.name,
    color: x.$.color
  }));
}

function mapParts(parts) {
  if (!parts) return null;
  return parts.part.map(x => ({
    id: x.$.id,
    categoryId: x.$.categoryId,
    length: x.$.length
  }));
}

function mapVisualization(visualization) {
  switch (visualization.$.uri) {
    case URN_SOUND_VISUALIZATION_0_8:
    case URN_SOUND_VISUALIZATION_1_0:
      return mapSoundVisualization(visualization);
    case URN_LYRICS_VISUALIZATION_0_8:
    case URN_LYRICS_VISUALIZATION_1_0:
      return mapLyricsVisualization(visualization);
    case URN_HARMONIES_VISUALIZATION_0_8:
    case URN_HARMONIES_VISUALIZATION_1_0:
      return mapHarmoniesVisualization(visualization);
    case URN_ANNOTATIONS_VISUALIZATION_0_8:
    case URN_ANNOTATIONS_VISUALIZATION_1_0:
      return mapAnnotationsVisualization(visualization);
    defualt:
      throw new Error(`Invalid visualization URI: ${visualization.$.uri}`);
  }
}

function mapSoundVisualization(visualization) {
  return {
    id: visualization.$.id,
    type: 'sound',
    soundFile: visualization.soundFile ? visualization.soundFile[0].$ : null // { uri: 'resource|file:///...' } | null
  };
}

function mapLyricsVisualization(visualization) {
  return {
    id: visualization.$.id,
    type: 'lyrics',
    lyrics: {
      defaultBackground: visualization.lyrics[0].$.defaultBackground,
      defaultAlternateBackground: visualization.lyrics[0].$.defaultAlternateBackground,
      parts: visualization.lyrics[0].part.map(x => x.$) // attributes: text, customBackground?
    }
  };
}

function mapHarmoniesVisualization(visualization) {
  return {
    id: visualization.$.id,
    type: 'harmonies',
    harmonies: {
      defaultBackground: visualization.harmonies[0].$.defaultBackground,
      defaultAlternateBackground: visualization.harmonies[0].$.defaultAlternateBackground,
      parts: visualization.harmonies[0].part.map(x => x.$) // attributes: text, customBackground?
    }
  };
}

function mapAnnotationsVisualization(visualization) {
  return {
    id: visualization.$.id,
    type: 'annotations',
    annotations: {
      defaultBackground: visualization.annotations[0].$.defaultBackground,
      defaultAlternateBackground: visualization.annotations[0].$.defaultAlternateBackground,
      parts: visualization.annotations[0].part.map(x => x.$) // attributes: text, customBackground?
    }
  };
}

function mapResourceList(resourceList) {
  return {
    visualizationId: resourceList.$.visualizationId,
    items: resourceList.resource.map(x => ({
      name: x.$.name,
      relationshipId: x.$.relationshipId
    }))
  };
}
