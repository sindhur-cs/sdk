import { EntryReferenceResolver } from "../../entry_references_sdk/dist/entry.reference.resolver.js";
import { InvokingService } from '../../entry_references_sdk/dist/invoking.service.js';
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

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
}

const apiKey = process.env.API_KEY || "";
const mail = process.env.MAIL || "";
const pass = process.env.PASSWORD || "";
const baseUrl = process.env.BASE_URL || "";

const _referenceProcessor = (result: any) => ({
    process: async (refs: any) => {
        if(result.find((reference: any) => reference.uid === refs.uid)) {
            return;
        }

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

const main = async (authtoken: string, variants: any[]) => {
    const entryReferenceResolver = new EntryReferenceResolver();
    const allVariantsResults: any[] = [];
    const processedUids = new Set<string>();

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
                delete entryData.publish_details;
                delete entryData._rules;
                delete entryData.assets_references;

                return entryData;
            }
        }

        // fetch all locales & variants data 
        await Promise.all(variants.map(async (variant: any) => {       
            let result : any[] = [];
            // await Promise.all(localeData.locales.map(async (locale: any) => {
            await entryReferenceResolver.resolve(variant, _itemRetriever, _referenceProcessor(result), 10000, InvokingService.CMA, 'main', 'en-us');
            // }));
            
            const variantUid = variant?._variant?._uid || "Base Entry";
            const resultant = { entry_uid: variantUid, references: modifyRecursive(result, processedUids) }
            allVariantsResults.push(resultant);
            processedUids.clear();
        }));
    }
    catch (error) {
        console.error(error);
    }

    // const modifiedResult = modifyRecursive(result, processedUids);

    // fs.writeFileSync("result.json", JSON.stringify(modifiedResult, null, 2), "utf-8");
    fs.writeFileSync("allvariants.json", JSON.stringify({ variants: allVariantsResults }, null, 2), "utf-8");
}

const modifyRecursive = (result: any, processedUids: Set<string>) => {    
    return result.filter((ele: any) => {
        if(!processedUids.has(ele.uid)) {
            // Rename uid and _content_type_uid
            ele.entry_uid = ele.uid;
            ele.content_type_uid = ele._content_type_uid;
            delete ele.uid;
            delete ele._content_type_uid;

            // Remove specified fields
            delete ele._workflow;
            delete ele.publish_details;
            delete ele.has_child;
            delete ele._in_progress;
            delete ele._version;
            delete ele._rules;
            delete ele.parent_uid;
            delete ele._content_type_title;

            // Move references out of _metadata
            ele.references = ele._metadata?.references || [];
            delete ele._metadata;

            if (!ele.references || ele.references.length === 0) {
                delete ele.references;
                return ele;
            }

            processedUids.clear();
            
            ele.references = ele.references.map((ref: any) => {
                return recursiveFunc(result, ref, processedUids);
            }).filter(Boolean); // Remove any undefined/null entries

            // Remove references array if empty after filtering
            if (ele.references.length === 0) {
                delete ele.references;
            }

            return ele;
        }
    });
}

const recursiveFunc = (result: any, ref: any, processedUids: Set<string>) => {
    if (processedUids.has(ref.uid)) {
        return {
            entry_uid: ref.uid,
            content_type_uid: ref._content_type_uid,
        };
    }

    processedUids.add(ref.uid);
    
    const referredResult = result.find((res: any) => res.uid === ref.uid);
    
    // Rename uid and _content_type_uid
    ref.entry_uid = ref.uid;
    ref.content_type_uid = ref._content_type_uid;
    delete ref.uid;
    delete ref._content_type_uid;

    // Remove specified fields
    delete ref._workflow;
    delete ref.publish_details;
    delete ref.has_child;
    delete ref._in_progress;
    delete ref._version;
    delete ref._rules;
    delete ref.parent_uid;
    delete ref._content_type_title;

    // Move references out of _metadata
    ref.references = ref._metadata?.references || [];
    delete ref._metadata;

    if (!referredResult) {
        if (ref.references.length === 0) {
            delete ref.references;
        }
        return ref;
    }

    const fullRef = { ...ref };
    fullRef.references = referredResult._metadata?.references?.map((nestedRef: any) => 
        recursiveFunc(result, { ...nestedRef }, processedUids)
    ).filter(Boolean) || []; // Remove any undefined/null entries

    // Remove references array if empty after filtering
    if (fullRef.references.length === 0) {
        delete fullRef.references;
    }

    return fullRef;
}

const getVariants = async (authtoken: string, contentTypeUid: string, entryUid: string) => {
    const headers = {
        api_key: apiKey,
        authtoken,
        "Content-Type": "application/json",
    };

    const baseEntryResponse = await axios.get(
        `https://app.contentstack.com/api/v3/content_types/${contentTypeUid}/entries/${entryUid}/descendants`,
        { headers }
    );
    const baseEntry = baseEntryResponse.data;

    baseEntry._metadata = {
        references: baseEntry.entries_references,
    };

    delete baseEntry.entries_references;

    const response = await axios.get(
        `https://${baseUrl}/v3/content_types/${contentTypeUid}/entries/${entryUid}/variants/`,
        { headers }
    );
    const result = response.data;

    const baseEntryReferences = baseEntry._metadata.references;

    const variants = result.entries.map((entry: any, index: number) => {
        if (!entry?._metadata?.references) return { ...baseEntry, _variant: entry._variant };

        const modifiedReferences = [
            ...baseEntryReferences.filter((ref: any) => {
                const isRefChanged = entry._metadata.references.find(
                    (reference: any) => reference.uid === ref.uid
                );
                return !isRefChanged || !isRefChanged.deleted;
            }),
            ...entry._metadata.references.filter((ref: any) => !ref.deleted),
        ];

        return {
            ...baseEntry,
            _variant: entry._variant,
            _metadata: { references: modifiedReferences },
        };
    });

    fs.writeFileSync("variants.json", JSON.stringify([baseEntry, ...variants], null, 2), "utf-8");

    return [baseEntry, ...variants];
};

loginAndFetch(mail, pass)
    .then(async (authtoken) => {
        const variants = await getVariants(authtoken, data._content_type_uid, data.uid);
        main(authtoken, variants);
    })
    .catch((error) => {
        console.error(error);
    })