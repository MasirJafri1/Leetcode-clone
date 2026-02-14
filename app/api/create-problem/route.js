import { db } from "@/lib/db";
import { getJudge0LanguageId, pollBatchResults, submitBatch } from "@/lib/judge0";
import { currentUserRole, getCurrentUser } from "@/modules/auth/actions";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const userRole = await currentUserRole()
        const user = await getCurrentUser()

        if (userRole !== UserRole.ADMIN) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()

        if (!body) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 })
        }

        // Get all the fields from the client side 
        const { title, description, difficulty, tags, examples, constraints, testCases, codeSnippets, referenceSolution } = body

        // basic validations 
        if (!title || !description || !difficulty || !tags || !examples || !constraints || !testCases || !codeSnippets || !referenceSolution) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // validate test cases 
        if (!Array.isArray(testCases) || testCases.length === 0) {
            return NextResponse.json({ error: "At least one test case is required" }, { status: 400 })
        }

        // validate reference solution 
        if (!referenceSolution || typeof referenceSolution !== "object") {
            return NextResponse.json({ error: "Invalid reference solution" }, { status: 400 })
        }

        for (const [language, solutionCode] of Object.entries(referenceSolution)) {
            // get a judge0 language id for the current language 
            const languageId = getJudge0LanguageId(language)

            if (!languageId) {
                return NextResponse.json({ error: "Invalid language :" + language }, { status: 400 })
            }

            // prepare judge0 submissions for all test cases 
            const submissions = testCases.map((testCase) => ({
                source_code: solutionCode,
                language_id: languageId,
                stdin: testCase.input,
                expected_output: testCase.output,
            }))

            // submit all test cases in one batch 
            const submissionResult = await submitBatch(submissions)

            const tokens = submissionResult.map((res) => res.token)

            const results = await pollBatchResults(tokens)

            for (let i = 0; i < results.length; i++) {
                const result = results[i];

                if (result.status.id !== 3) {
                    return NextResponse.json({
                        error: "Validation failed for " + language,
                        testCases: {
                            input: submissions[i].stdin,
                            expectedOutput: submissions[i].expected_output,
                            actualOutput: result.stdout,
                            error: result.stderr || result.compile_output,
                        },
                        details: result,
                    },
                        { status: 400 })
                }
            }
        }

        // save the problem in the database
        const newProblem = await db.problem.create({
            data: {
                title,
                description,
                difficulty,
                tags,
                examples,
                constraints,
                testCases,
                codeSnippets,
                referenceSolution,
                userId: user.id,
            }
        })

        return NextResponse.json({ success: true, message: "Problem created successfully", data: newProblem }, { status: 201 })

    } catch (error) {
        console.error("Error creating problem:", error);
        return NextResponse.json({ error: "An error occurred while creating the problem" }, { status: 500 })
    }
}