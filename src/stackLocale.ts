import { EntryReferenceResolver } from "../../entry_references_sdk/dist/entry.reference.resolver.js";
import { InvokingService } from '../../entry_references_sdk/dist/invoking.service.js';
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

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
}


const apiKey = process.env.API_KEY || "";
const mail = process.env.MAIL || "";
const pass = process.env.PASSWORD || "";
const baseUrl = process.env.BASE_URL || "";

const _referenceProcessor = (result: any) => ({
    process: async (refs: any) => {
        result.push(refs)
    }
});

async function loginAndFetch(mail: string, pass: string) {
    const loginData = {
        user: {
            email: mail,
            password: pass,
        },
    };

    const loginRes = await axios.post(`https://${baseUrl}/v3/user-session`, loginData);
    return loginRes.data.user.authtoken;
}

const main = async (authtoken: string) => {
    const entryReferenceResolver = new EntryReferenceResolver();
    const result: any = [];

    try {
        // fetch the locales from the stack
        const localeResponse = await axios.get(`https://${baseUrl}/v3/locales`, {
            headers: {
                api_key: apiKey,
                authtoken: authtoken,
                "Content-Type": "application/json"
            }
        });

        const localeData = await localeResponse.data;

        console.log("localeData", localeData);

        const _itemRetriever = {
            getItem: async (uid: string, branch: string, language: any, type: string, contentTypeUid?: string) => {
                const headers = {
                    api_key: apiKey,
                    authtoken: authtoken,
                    "Content-Type": "application/json"
                };
                
                const entryResponse = await axios.get(`https://app.contentstack.com/api/v3/content_types/${contentTypeUid}/entries/${uid}/descendants?locale=${language}`, { headers });

                let entryData = await entryResponse.data;

                entryData._metadata = {
                    references: entryData.entries_references
                }

                delete entryData.entries_references;

                return entryData;
            }
        }

        // fetch all locales data
         
            await Promise.all(localeData.locales.map(async (locale: any) => {
                await entryReferenceResolver.resolve(data, _itemRetriever, _referenceProcessor(result), 10000, InvokingService.CMA, 'main', locale.code);
            }));

        // await entryReferenceResolver.resolve(data, _itemRetriever, _referenceProcessor(result, authtoken), 10000, InvokingService.CMA, 'main', 'en-us');

    }
    catch (error) {
        console.error(error);
    }

    console.log("RES", result);

    fs.writeFileSync("stackLocale.json", JSON.stringify(result, null, 2), "utf-8");
}


loginAndFetch(mail, pass)
    .then((authtoken) => {
        main(authtoken);
    })
    .catch((error) => {
        console.error(error);
    })

// locale
// variant