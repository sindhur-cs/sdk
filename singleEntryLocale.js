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
    "_content_type_uid": "blog",
    "uid": "blt5b202fdaa2a71417",
    "_metadata": {
        "references": [
            {
                "uid": "blteba67aabc952b5d4",
                "_content_type_uid": "meetups",
            },
            {
                "uid": "blt6f0e30fbd9e033d0",
                "_content_type_uid": "author",
            },
            {
                "uid": "blte9aaea031b02e0cd",
                "_content_type_uid": "author"
            }
        ]
    }
};
const apiKey = process.env.API_KEY || "";
const mail = process.env.MAIL || "";
const pass = process.env.PASSWORD || "";
const baseUrl = process.env.BASE_URL || "";
const _referenceProcessor = (result, authToken) => ({
    process: (refs) => __awaiter(void 0, void 0, void 0, function* () {
        const entryLocalesResponse = yield axios_1.default.get(`https://${baseUrl}/v3/content_types/${refs._content_type_uid}/entries/${refs.uid}/locales`, {
            headers: {
                api_key: apiKey,
                authtoken: authToken,
                "Content-Type": "application/json"
            }
        });
        const { locales } = yield entryLocalesResponse.data;
        result.push(...locales.map((locale) => {
            const refsObject = refs;
            refsObject.localized = locale.localized || null;
            return Object.assign(Object.assign({}, refsObject), { locale: locale.code });
        }));
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
const main = (authtoken) => __awaiter(void 0, void 0, void 0, function* () {
    const entryReferenceResolver = new entry_reference_resolver_js_1.EntryReferenceResolver();
    const result = [];
    try {
        /*
            fetch the locales from the stack
            const localeResponse = await axios.get(`https://${baseUrl}/v3/locales`, {
                headers: {
                    api_key: apiKey,
                    authtoken: authtoken,
                    "Content-Type": "application/json"
                }
            });
    
            const localeData = await localeResponse.data;
    
            console.log("localeData", localeData);
        */
        const _itemRetriever = {
            getItem: (uid, branch, language, type, contentTypeUid) => __awaiter(void 0, void 0, void 0, function* () {
                const headers = {
                    api_key: apiKey,
                    authtoken: authtoken,
                    "Content-Type": "application/json"
                };
                const entryResponse = yield axios_1.default.get(`https://app.contentstack.com/api/v3/content_types/${contentTypeUid}/entries/${uid}/descendants`, { headers });
                let entryData = yield entryResponse.data;
                entryData._metadata = {
                    references: entryData.entries_references
                };
                delete entryData.entries_references;
                return entryData;
            })
        };
        // fetch all locales data
        /*
            await Promise.all(localeData.locales.map(async (locale: any) => {
                await entryReferenceResolver.resolve(data, _itemRetriever(locale), _referenceProcessor(result), 10000, InvokingService.CMA, 'main', 'en-us');
            }));
        */
        yield entryReferenceResolver.resolve(data, _itemRetriever, _referenceProcessor(result, authtoken), 10000, invoking_service_js_1.InvokingService.CMA, 'main', 'en-us');
    }
    catch (error) {
        console.error(error);
    }
    console.log("RES", result);
    fs_1.default.writeFileSync("result.json", JSON.stringify(result, null, 2), "utf-8");
});
loginAndFetch(mail, pass)
    .then((authtoken) => {
    main(authtoken);
})
    .catch((error) => {
    console.error(error);
});
// locale
// variant
