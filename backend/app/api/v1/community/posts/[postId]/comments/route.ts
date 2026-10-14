import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    const post = await prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    const comments = await prisma.comment.findMany({
      where: { postId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: comments,
      total: comments.length,
    });
  } catch (error: any) {
    console.error('[API v1 /community/posts/:postId/comments GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const body = await request.json().catch(() => ({}));
    const content = (body.content || '').trim();

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Comment content cannot be empty' },
        { status: 400 }
      );
    }

    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required to comment' },
        { status: 401 }
      );
    }

    const authorName = user.name || body.authorName || 'शेजारी (Neighbour)';

    const post = await prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Create comment and increment post commentsCount atomically in transaction
    const [newComment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          postId,
          authorName,
          content,
        },
      }),
      prisma.post.update({
        where: { id: postId },
        data: {
          commentsCount: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: newComment,
        message: 'Comment added successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API v1 /community/posts/:postId/comments POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
