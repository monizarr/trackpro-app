import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const ROLE_OPTIONS = [
  "OWNER",
  "KEPALA_GUDANG",
  "KEPALA_PRODUKSI",
  "PEMOTONG",
  "PENJAHIT",
  "FINISHING",
] as const;

type RoleOption = (typeof ROLE_OPTIONS)[number];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER"]);

    const { id } = await params;
    const body = await request.json();
    const { name, username, email, role, password, isActive } = body as {
      name?: string;
      username?: string;
      email?: string;
      role?: RoleOption;
      password?: string;
      isActive?: boolean;
    };

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Employee not found",
        },
        { status: 404 },
      );
    }

    if (role && !ROLE_OPTIONS.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid role",
        },
        { status: 400 },
      );
    }

    if (
      (username && username !== existingUser.username) ||
      (email && email !== existingUser.email)
    ) {
      const conflictUser = await prisma.user.findFirst({
        where: {
          OR: [
            username ? { username } : undefined,
            email ? { email } : undefined,
          ].filter(Boolean) as Array<{ username?: string; email?: string }>,
          NOT: { id },
        },
      });

      if (conflictUser) {
        return NextResponse.json(
          {
            success: false,
            error: "Username or email already exists",
          },
          { status: 400 },
        );
      }
    }

    const updateData: {
      name?: string;
      username?: string;
      email?: string;
      role?: RoleOption;
      isActive?: boolean;
      password?: string;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedEmployee = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedEmployee,
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update employee",
      },
      { status: 500 },
    );
  }
}
