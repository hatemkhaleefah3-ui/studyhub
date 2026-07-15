import { useState, useRef } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import { motion, PanInfo } from "framer-motion";
import { useStudyData } from "@/hooks/useStudyData";

/**
 * Lecture File Reader — embeds a Google Drive file in an iframe.
 * Opened by swiping left on a lecture card in SubjectDetail, or via the
 * nav strip arrow on the LectureEdit page.
 *
 * Extracts the Drive file ID and builds the preview URL:
 *   https://drive.google.com/file/d/FILE_ID/preview
 */

function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  // Matches /file/d/FILE_ID/... or id=FILE_ID
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  // Already a raw ID (no slashes, no spaces)
  if (/^[a-zA-Z0-9_-]{10,}$/.test(url.trim())) return url.trim();
  return null;
}

const SWIPE_BACK_THRESHOLD = 80;

export function LectureReader() {
  const [, params] = useRoute("/subjects/:subjectId/lectures/:lectureId/reader");
  const [, setLocation] = useLocation();
  const { subjects } = useStudyData();

  const subject = subjects.find(s => s.id === params?.subjectId);
  const lecture = subject?.lectures.find(l => l.id === params?.lectureId);

  const [loaded, setLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const dragStartX = useRef(0);

  if (!subject || !lecture) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Lecture not found
      </div>
    );
  }

  const fileId = extractDriveFileId(lecture.link || "");
  const embedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_BACK_THRESHOLD) {
      setLocation(`/subjects/${subject.id}/lectures/${lecture.id}`);
    }
  };

  const goBack = () =>
    setLocation(`/subjects/${subject.id}/lectures/${lecture.id}`);

  return (
    <motion.div
      className="flex flex-col h-[calc(100dvh-4rem)] -mt-4 -mx-4 md:-mx-6"
      drag="x"
      dragElastic={{ left: 0, right: 0.15 }}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      style={{ touchAction: "pan-y" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-border/50 bg-background/80 backdrop-blur-md shrink-0">
        <button
          onClick={goBack}
          className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold tracking-tight truncate text-foreground">
            {lecture.name}
          </h1>
          <p className="text-xs text-muted-foreground">Google Drive viewer</p>
        </div>
        <Link
          href={`/subjects/${subject.id}/lectures/${lecture.id}`}
          className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-xl bg-primary/10"
        >
          Edit
        </Link>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden bg-muted/20">
        {!embedUrl ? (
          /* No valid Drive link */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">No Drive link set</p>
              <p className="text-sm text-muted-foreground">
                Add a Google Drive share link to this lecture to preview the file here.
              </p>
            </div>
            <button
              onClick={goBack}
              className="mt-2 bg-primary text-primary-foreground font-semibold rounded-xl px-5 py-2.5"
            >
              Edit Lecture
            </button>
          </div>
        ) : (
          <>
            {/* Loading overlay */}
            {!loaded && !iframeError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm z-10">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground font-medium">Loading file…</p>
              </div>
            )}

            {/* Error overlay */}
            {iframeError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center z-10 bg-background">
                <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">File couldn't load</p>
                  <p className="text-sm text-muted-foreground">
                    Make sure the file is shared as "Anyone with the link can view" on Google Drive.
                  </p>
                </div>
                <a
                  href={lecture.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary text-primary-foreground font-semibold rounded-xl px-5 py-2.5"
                >
                  Open in Drive
                </a>
              </div>
            )}

            <iframe
              key={embedUrl}
              src={embedUrl}
              title={lecture.name}
              className="w-full h-full border-0"
              allow="autoplay"
              onLoad={() => setLoaded(true)}
              onError={() => setIframeError(true)}
            />
          </>
        )}
      </div>

      {/* ── Swipe hint ──────────────────────────────────────────────────── */}
      <p className="text-center text-[10px] text-muted-foreground/50 py-2 shrink-0 select-none">
        Swipe right to go back
      </p>
    </motion.div>
  );
}
