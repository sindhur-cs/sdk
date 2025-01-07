"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const entry_reference_resolver_js_1 = require("../../entry_references_sdk/dist/entry.reference.resolver.js");
const invoking_service_js_1 = require("../../entry_references_sdk/dist/invoking.service.js");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const data = {
    "_content_type_uid": "blog_post",
    "uid": "blt653e2662e0e1ac42",
    "_metadata": {
        "references": [
            {
                "uid": "bltde17ace76d6ecb71",
                "_content_type_uid": "author",
            },
            {
                "uid": "blt8477e989295ce34a",
                "_content_type_uid": "blog_post",
            },
            {
                "uid": "blt47132635c86bb788",
                "_content_type_uid": "blog_post"
            },
            {
                "uid": "blt4dd82445c1cd01a6",
                "_content_type_uid": "blog_post"
            }
        ]
    }
};
const apiKey = process.env.API_KEY || "";
const mail = process.env.MAIL || "";
const pass = process.env.PASSWORD || "";
const baseUrl = process.env.BASE_URL || "";
const _referenceProcessor = (result) => ({
    process: (refs) => __awaiter(void 0, void 0, void 0, function* () {
        if (result.find((reference) => reference.uid === refs.uid)) {
            return;
        }
        result.push(refs);
    })
});
function loginAndFetch(mail, pass) {
    return __awaiter(this, void 0, void 0, function* () {
        const loginData = {
            user: {
                email: mail,
                password: pass,
            },
        };
        const loginRes = yield axios_1.default.post(`https://${baseUrl}/v3/user-session`, loginData);
        return loginRes.data.user.authtoken;
    });
}
const main = (authtoken, variants, baseEntry) => __awaiter(void 0, void 0, void 0, function* () {
    const entryReferenceResolver = new entry_reference_resolver_js_1.EntryReferenceResolver();
    const allVariantsResults = [];
    const processedUids = new Set();
    try {
        // fetch the locales from the stack
        const localeResponse = yield axios_1.default.get(`https://${baseUrl}/v3/locales`, {
            headers: {
                api_key: apiKey,
                authtoken: authtoken,
                "Content-Type": "application/json"
            }
        });
        const localeData = yield localeResponse.data;
        const _itemRetriever = {
            getItem: (uid, branch, language, type, contentTypeUid) => __awaiter(void 0, void 0, void 0, function* () {
                const headers = {
                    api_key: apiKey,
                    authtoken: authtoken,
                    "Content-Type": "application/json"
                };
                const entryResponse = yield axios_1.default.get(`https://app.contentstack.com/api/v3/content_types/${contentTypeUid}/entries/${uid}/descendants?locale=${language}`, { headers });
                let entryData = yield entryResponse.data;
                entryData._metadata = {
                    references: entryData.entries_references
                };
                delete entryData.entries_references;
                delete entryData.publish_details;
                delete entryData._rules;
                delete entryData.assets_references;
                return entryData;
            })
        };
        // fetch all locales & variants data 
        yield Promise.all(variants.map((variant) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            let result = [];
            // await Promise.all(localeData.locales.map(async (locale: any) => {
            yield entryReferenceResolver.resolve(variant, _itemRetriever, _referenceProcessor(result), 10000, invoking_service_js_1.InvokingService.CMA, 'main', 'en-us');
            // }));
            const variantUid = ((_a = variant === null || variant === void 0 ? void 0 : variant._variant) === null || _a === void 0 ? void 0 : _a._uid) || "Base Entry";
            const resultant = { entry_uid: variantUid, references: modifyRecursive(result, processedUids) };
            allVariantsResults.push(resultant);
            processedUids.clear();
        })));
    }
    catch (error) {
        console.error(error);
    }
    // const modifiedResult = modifyRecursive(result, processedUids);
    // fs.writeFileSync("result.json", JSON.stringify(modifiedResult, null, 2), "utf-8");
    fs_1.default.writeFileSync("allvariants.json", JSON.stringify({
        title: baseEntry.title,
        entry_uid: `${baseEntry.uid}-${baseEntry.locale.split("-")[0]}`,
        content_type_uid: baseEntry._content_type_uid, locale: baseEntry.locale,
        variants: allVariantsResults
    }, null, 2), "utf-8");
});
const modifyRecursive = (result, processedUids) => {
    return result.filter((ele) => {
        var _a;
        if (!processedUids.has(`${ele.uid}-${ele.locale.split("-")[0]}`)) {
            ele.entry_uid = `${ele.uid}-${ele.locale.split("-")[0]}`;
            ele.content_type_uid = ele._content_type_uid;
            delete ele.uid;
            delete ele._content_type_uid;
            delete ele._workflow;
            delete ele.publish_details;
            delete ele.has_child;
            delete ele._in_progress;
            delete ele._version;
            delete ele._rules;
            delete ele.parent_uid;
            delete ele._content_type_title;
            ele.references = ((_a = ele._metadata) === null || _a === void 0 ? void 0 : _a.references) || [];
            delete ele._metadata;
            if (!ele.references || ele.references.length === 0) {
                delete ele.references;
                return ele;
            }
            processedUids.clear();
            ele.references = ele.references.map((ref) => {
                return recursiveFunc(result, ref, processedUids);
            }).filter(Boolean);
            if (ele.references.length === 0) {
                delete ele.references;
            }
            return ele;
        }
    });
};
const recursiveFunc = (result, ref, processedUids) => {
    var _a, _b, _c;
    if (processedUids.has(`${ref.uid}-${ref.locale.split("-")[0]}`)) {
        return {
            title: ref.title,
            locale: ref.locale,
            entry_uid: `${ref.uid}-${ref.locale.split("-")[0]}`,
            content_type_uid: ref._content_type_uid,
        };
    }
    processedUids.add(`${ref.uid}-${ref.locale.split("-")[0]}`);
    const referredResult = result.find((res) => res.uid === ref.uid);
    ref.entry_uid = `${ref.uid}-${ref.locale.split("-")[0]}`;
    ref.content_type_uid = ref._content_type_uid;
    delete ref.uid;
    delete ref._content_type_uid;
    delete ref._workflow;
    delete ref.publish_details;
    delete ref.has_child;
    delete ref._in_progress;
    delete ref._version;
    delete ref._rules;
    delete ref.parent_uid;
    delete ref._content_type_title;
    ref.references = ((_a = ref._metadata) === null || _a === void 0 ? void 0 : _a.references) || [];
    delete ref._metadata;
    if (!referredResult) {
        if (ref.references.length === 0) {
            delete ref.references;
        }
        return ref;
    }
    const fullRef = Object.assign({}, ref);
    fullRef.references = ((_c = (_b = referredResult._metadata) === null || _b === void 0 ? void 0 : _b.references) === null || _c === void 0 ? void 0 : _c.map((nestedRef) => recursiveFunc(result, Object.assign({}, nestedRef), processedUids)).filter(Boolean)) || [];
    if (fullRef.references.length === 0) {
        delete fullRef.references;
    }
    return fullRef;
};
const getVariants = (authtoken, contentTypeUid, entryUid) => __awaiter(void 0, void 0, void 0, function* () {
    const headers = {
        api_key: apiKey,
        authtoken,
        "Content-Type": "application/json",
    };
    const baseEntryResponse = yield axios_1.default.get(`https://app.contentstack.com/api/v3/content_types/${contentTypeUid}/entries/${entryUid}/descendants`, { headers });
    const baseEntry = baseEntryResponse.data;
    baseEntry._metadata = {
        references: baseEntry.entries_references,
    };
    delete baseEntry.entries_references;
    const response = yield axios_1.default.get(`https://${baseUrl}/v3/content_types/${contentTypeUid}/entries/${entryUid}/variants/`, { headers });
    const result = response.data;
    const baseEntryReferences = baseEntry._metadata.references;
    const variants = result.entries.map((entry, index) => {
        var _a;
        if (!((_a = entry === null || entry === void 0 ? void 0 : entry._metadata) === null || _a === void 0 ? void 0 : _a.references))
            return Object.assign(Object.assign({}, baseEntry), { _variant: entry._variant });
        const modifiedReferences = [
            ...baseEntryReferences.filter((ref) => {
                const isRefChanged = entry._metadata.references.find((reference) => reference.uid === ref.uid);
                return !isRefChanged || !isRefChanged.deleted;
            }),
            ...entry._metadata.references.filter((ref) => !ref.deleted),
        ];
        return Object.assign(Object.assign({}, baseEntry), { _variant: entry._variant, _metadata: { references: modifiedReferences } });
    });
    fs_1.default.writeFileSync("variants.json", JSON.stringify([baseEntry, ...variants], null, 2), "utf-8");
    return [baseEntry, ...variants];
});
loginAndFetch(mail, pass)
    .then((authtoken) => __awaiter(void 0, void 0, void 0, function* () {
    const variants = yield getVariants(authtoken, data._content_type_uid, data.uid);
    main(authtoken, variants, variants[0]);
}))
    .catch((error) => {
    console.error(error);
});
