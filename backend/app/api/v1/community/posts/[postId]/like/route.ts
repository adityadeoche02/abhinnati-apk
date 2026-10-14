import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required to like posts' },
        { status: 401 }
      );
    }

    // Perform atomic transaction to prevent concurrent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId, deletedAt: null },
      });

      if (!post) {
        return { notFound: true };
      }

      let likedBy: string[] = [];
      try {
        likedBy = JSON.parse(post.likedBy || '[]');
      } catch (_) {
        likedBy = [];
      }

      if (!likedBy.includes(user.id)) {
        likedBy.push(user.id);
        const updatedPost = await tx.post.update({
          where: { id: postId },
          data: {
            likes: likedBy.length,
            likedBy: JSON.stringify(likedBy),
          },
        });
        return { post: updatedPost, hasLiked: true };
      }

      return { post, hasLiked: true };
    });

    if (result.notFound) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        postId,
        likes: result.post?.likes || 0,
        hasLiked: result.hasLiked,
      },
    });
  } catch (error: any) {
    console.error('[API v1 /community/posts/:postId/like POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to like post' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required to unlike posts' },
        { status: 401 }
      );
    }

    // Atomic transaction for unliking
    const result = await prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId, deletedAt: null },
      });

      if (!post) {
        return { notFound: true };
      }

      let likedBy: string[] = [];
      try {
        likedBy = JSON.parse(post.likedBy || '[]');
      } catch (_) {
        likedBy = [];
      }

      const index = likedBy.indexOf(user.id);
      if (index > -1) {
        likedBy.splice(index, 1);
        const updatedPost = await tx.post.update({
          where: { id: postId },
          data: {
            likes: likedBy.length,
            likedBy: JSON.stringify(likedBy),
          },
        });
        return { post: updatedPost, hasLiked: false };
      }

      return { post, hasLiked: false };
    });

    if (result.notFound) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        postId,
        likes: result.post?.likes || 0,
        hasLiked: result.hasLiked,
      },
    });
  } catch (error: any) {
    console.error('[API v1 /community/posts/:postId/like DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unlike post' },
      { status: 500 }
    );
  }
}
