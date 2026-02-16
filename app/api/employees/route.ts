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

export async function GET() {
  try {
    await requireRole(["OWNER"]);

    const employees = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch employees",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["OWNER"]);

    const body = await request.json();
    const { name, username, email, role, password, isActive } = body as {
      name?: string;
      username?: string;
      email?: string;
      role?: RoleOption;
      password?: string;
      isActive?: boolean;
    };

    if (!name || !username || !email || !role || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Name, username, email, role, and password are required",
        },
        { status: 400 },
      );
    }

    if (!ROLE_OPTIONS.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid role",
        },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Username or email already exists",
        },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = await prisma.user.create({
      data: {
        name,
        username,
        email,
        role,
        password: hashedPassword,
        isActive: isActive ?? true,
      },
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
      data: employee,
    });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create employee",
      },
      { status: 500 },
    );
  }
}
