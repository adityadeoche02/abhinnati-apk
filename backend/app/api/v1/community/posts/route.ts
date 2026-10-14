import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { verifyAuth } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required to create a post' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { areaId, tag, title_mr, title_en, content_mr, content_en, content } = body;

    const postContentMr = (content_mr || content || '').trim();
    const postContentEn = (content_en || content || '').trim();

    if (!postContentMr && !postContentEn) {
      return NextResponse.json(
        { success: false, error: 'Post content cannot be empty' },
        { status: 400 }
      );
    }

    // Duplicate post prevention: check if same author posted identical content in the last 60 seconds
    const recentDuplicate = await prisma.post.findFirst({
      where: {
        authorId: user.id,
        contentMr: postContentMr,
        contentEn: postContentEn,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
        deletedAt: null,
      },
    });

    if (recentDuplicate) {
      return NextResponse.json(
        { success: false, error: 'Duplicate post: You recently published an identical post' },
        { status: 400 }
      );
    }

    const titleMr = (title_mr || postContentMr.slice(0, 30) || 'पोस्ट').trim();
    const titleEn = (title_en || postContentEn.slice(0, 30) || 'Community Post').trim();

    const newPost = await prisma.post.create({
      data: {
        authorId: user.id,
        authorName: user.name || body.authorName || 'शेजारी (Neighbour)',
        areaId: areaId || 'area-kothrud',
        tag: tag || 'community',
        titleMr,
        titleEn,
        contentMr: postContentMr,
        contentEn: postContentEn,
        likes: 0,
        likedBy: '[]',
        commentsCount: 0,
      },
    });

    const mappedPost = {
      id: newPost.id,
      authorId: newPost.authorId,
      authorName: newPost.authorName,
      areaId: newPost.areaId,
      tag: newPost.tag,
      title_mr: newPost.titleMr,
      title_en: newPost.titleEn,
      content_mr: newPost.contentMr,
      content_en: newPost.contentEn,
      likes: newPost.likes,
      likedBy: [],
      commentsCount: newPost.commentsCount,
      createdAt: newPost.createdAt.toISOString(),
    };

    return NextResponse.json({ success: true, data: mappedPost }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating post:", error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create post' }, { status: 500 });
  }
}
