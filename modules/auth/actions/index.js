"use server";
import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export const onBoardUser = async () => {
  try {
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const { id, firstName, lastName, imageUrl, emailAddresses } = user;
    const email = emailAddresses[0].emailAddress || "";

    if (id) {
      const existingUser = await db.user.findUnique({
        where: {
          clerkId: id,
        },
      });

      if (existingUser) {
        const updatedUser = await db.user.update({
          where: {
            clerkId: id,
          },
          data: {
            firstName: firstName || null,
            lastName: lastName || null,
            imageUrl: imageUrl || null,
            email: email,
          },
        });
        return {
          success: true,
          user: updatedUser,
          message: "User onboarded successfully",
        };
      }
    }

    const existingEmailUser = await db.user.findUnique({
      where: {
        email: email,
      },
    });

    if (existingEmailUser) {
      const updatedUser = await db.user.update({
        where: {
          email: email,
        },
        data: {
          clerkId: id,
          firstName: firstName || null,
          lastName: lastName || null,
          imageUrl: imageUrl || null,
        },
      });
      return {
        success: true,
        user: updatedUser,
        message: "User onboarded successfully",
      };
    }

    const newUser = await db.user.create({
      data: {
        clerkId: id,
        firstName: firstName || null,
        lastName: lastName || null,
        imageUrl: imageUrl || null,
        email: email,
      },
    });

    return {
      success: true,
      user: newUser,
      message: "User onboarded successfully",
    };
  } catch (error) {
    console.error("Error onboarding user:", error);
    return {
      success: false,
      error: "An error occurred while onboarding the user",
    };
  }
};
