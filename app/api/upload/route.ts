import { auth } from '@/auth';
import cloudinary from '@/lib/cloudinary';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const rawFiles = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File | null;

    const filesToUpload: File[] = rawFiles.length > 0 ? rawFiles : singleFile ? [singleFile] : [];

    if (filesToUpload.length === 0) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    for (const file of filesToUpload) {
      if (file.size > 15 * 1024 * 1024) {
        return Response.json({ error: `File "${file.name}" is too large. Maximum size is 15MB per file.` }, { status: 400 });
      }
    }

    const uploadPromises = filesToUpload.map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'source_requests', resource_type: 'auto', original_filename: file.name },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(buffer);
      });

      return {
        path: (uploadResult as any).secure_url,
        name: file.name,
        size: file.size,
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    return Response.json(
      {
        files: uploadedFiles,
        path: uploadedFiles[0]?.path,
        name: uploadedFiles[0]?.name,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
