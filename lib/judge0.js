import axios from "axios";

export function getJudge0LanguageId(language) {
    const languageMap = {
        "PYTHON": 71,
        "JAVASCRIPT": 63,
        "JAVA": 62,
        "CPP": 54,
        "GO": 60,
    }
    return languageMap[language.toUpperCase()]
}

export async function submitBatch(submissions) {
    const { data } = await axios.post(
        `${process.env.JUDGE0_API_URL}/submissions/batch?base64_encoded=false`,
        { submissions }
    )

    console.log("Batch Submission response", data);

    return data
}

export async function pollBatchResults(tokens) {
    while (true) {
        const { data } = await axios.get(
            `${process.env.JUDGE0_API_URL}/submissions/batch`,
            {
                params: {
                    tokens: tokens.join(","),
                    base64_encoded: false
                }
            }
        )
        console.log(data);
        const results = data.submissions

        const isAllDone = results.every((result) => result.status.id !== 1 && result.status.id !== 2)

        if(isAllDone) return results

        await sleep(1000)

    }
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))