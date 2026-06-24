#!/usr/bin/env node
/**
 * Post-build script: patches JSON-LD schemas in translated pages.
 *
 * static-i18n cannot translate content inside <script> tags, so JSON-LD
 * schemas remain in English after the i18n build. This script replaces
 * them with translated versions from schemas/<lang>/ files.
 *
 * Schema files mirror the dist/ structure:
 *   schemas/fr/index.json         -> dist/fr/index.html
 *   schemas/fr/blog/article.json  -> dist/fr/blog/article.html
 *
 * Each schema file is a JSON array of JSON-LD objects. They are matched
 * to existing <script type="application/ld+json"> blocks by @type.
 *
 * Usage: node scripts/patch-schemas.js
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const SCHEMAS_DIR = path.join(__dirname, '..', 'schemas');

function getLanguages() {
    if (!fs.existsSync(SCHEMAS_DIR)) return [];
    return fs.readdirSync(SCHEMAS_DIR)
        .filter(f => fs.statSync(path.join(SCHEMAS_DIR, f)).isDirectory());
}

function getSchemaFiles(dir, prefix) {
    prefix = prefix || '';
    const files = [];
    for (const entry of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, entry);
        const relPath = prefix ? prefix + '/' + entry : entry;
        if (fs.statSync(fullPath).isDirectory()) {
            files.push.apply(files, getSchemaFiles(fullPath, relPath));
        } else if (entry.endsWith('.json')) {
            files.push(relPath);
        }
    }
    return files;
}

function extractJsonLdBlocks(html) {
    var regex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
    var blocks = [];
    var match;
    while ((match = regex.exec(html)) !== null) {
        blocks.push({
            fullMatch: match[0],
            content: match[1],
            index: match.index
        });
    }
    return blocks;
}

function getSchemaType(jsonStr) {
    try {
        return JSON.parse(jsonStr)['@type'];
    } catch (e) {
        return null;
    }
}

function patchFile(htmlPath, schemas) {
    if (!fs.existsSync(htmlPath)) {
        console.warn('  Skip: ' + htmlPath + ' not found');
        return false;
    }

    var html = fs.readFileSync(htmlPath, 'utf-8');
    var blocks = extractJsonLdBlocks(html);

    // Separate @graph schemas from @type schemas
    var graphSchema = null;
    var schemaMap = {};
    schemas.forEach(function(schema) {
        if (schema['@graph']) {
            graphSchema = schema;
        } else if (schema['@type']) {
            schemaMap[schema['@type']] = schema;
        }
    });

    var patched = false;

    // Replace from end to preserve indices
    for (var i = blocks.length - 1; i >= 0; i--) {
        var block = blocks[i];
        var parsed;
        try { parsed = JSON.parse(block.content); } catch (e) { continue; }

        var replacement = null;

        if (parsed['@graph'] && graphSchema) {
            // Match @graph blocks
            replacement = graphSchema;
        } else {
            // Match by @type
            var type = parsed['@type'];
            if (type && schemaMap[type]) {
                replacement = schemaMap[type];
            }
        }

        if (replacement) {
            var json = JSON.stringify(replacement, null, 4);
            // Indent to match HTML context (4 spaces)
            var indented = '\n    ' + json.split('\n').join('\n    ') + '\n    ';
            var newBlock = '<script type="application/ld+json">' + indented + '</script>';
            html = html.substring(0, block.index) + newBlock + html.substring(block.index + block.fullMatch.length);
            patched = true;
        }
    }

    if (patched) {
        fs.writeFileSync(htmlPath, html, 'utf-8');
    }
    return patched;
}

function main() {
    var languages = getLanguages();
    if (languages.length === 0) {
        console.log('patch-schemas: No translations found in schemas/');
        return;
    }

    console.log('patch-schemas: Found translations for: ' + languages.join(', '));
    var totalPatched = 0;

    languages.forEach(function(lang) {
        var langDir = path.join(SCHEMAS_DIR, lang);
        var schemaFiles = getSchemaFiles(langDir);

        schemaFiles.forEach(function(schemaFile) {
            var schemaPath = path.join(langDir, schemaFile);
            var htmlRel = schemaFile.replace(/\.json$/, '.html');
            var htmlPath = path.join(DIST_DIR, lang, htmlRel);

            try {
                var schemas = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
                if (!Array.isArray(schemas)) schemas = [schemas];

                if (patchFile(htmlPath, schemas)) {
                    console.log('  Patched: ' + lang + '/' + htmlRel);
                    totalPatched++;
                }
            } catch (err) {
                console.error('  Error: ' + lang + '/' + schemaFile + ': ' + err.message);
            }
        });
    });

    console.log('patch-schemas: ' + totalPatched + ' file(s) patched');
}

main();