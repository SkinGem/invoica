import { z } from 'zod';

/**
 * DIR-011 Compliance: Atomic File Change Validation
 * 
 * Validates that tasks contain only atomic file changes without
 * multi-part suffixes that indicate split deliverables.
 */

export interface TaskValidationError {
  code: string;
  message: string;
  field: string;
  value: string;
}

export interface TaskValidationResult {
  valid: boolean;
  errors: TaskValidationError[];
}

// Patterns that indicate non-atomic file changes
const FORBIDDEN_SUFFIX_PATTERNS = [
  /-[A-Z]$/i,           // -A, -B, -C, etc.
  /[Pp]art\d+$/,        // Part1, Part2, part1, part2, etc.
  /-[Pp]art\d+$/,       // -Part1, -part1, etc.
  /[Ss]ection\d+$/,     // Section1, section1, etc.
  /-[Ss]ection\d+$/,    // -Section1, -section1, etc.
  /[Cc]hunk\d+$/,       // Chunk1, chunk1, etc.
  /-[Cc]hunk\d+$/,      // -Chunk1, -chunk1, etc.
  /[Ff]ragment\d+$/,    // Fragment1, fragment1, etc.
  /-[Ff]ragment\d+$/,   // -Fragment1, -fragment1, etc.
];

/**
 * Extracts filename without extension from a file path
 */
function getFilenameWithoutExtension(filePath: string): string {
  const filename = filePath.split('/').pop() || '';
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
}

/**
 * Validates a single file path against DIR-011 compliance rules
 */
function validateFilePath(filePath: string): TaskValidationError | null {
  const filenameWithoutExt = getFilenameWithoutExtension(filePath);
  
  for (const pattern of FORBIDDEN_SUFFIX_PATTERNS) {
    if (pattern.test(filenameWithoutExt)) {
      return {
        code: 'DIR-011-VIOLATION',
        message: `File "${filePath}" violates DIR-011 atomic file change requirement. Filename contains multi-part suffix pattern "${pattern.source}". Tasks must contain only single atomic file changes.`,
        field: 'deliverableFiles',
        value: filePath
      };
    }
  }
  
  return null;
}

/**
 * Task schema for validation
 */
const TaskSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string(),
  deliverableFiles: z.array(z.string()).optional(),
  codeDeliverables: z.array(z.string()).optional(),
  files: z.array(z.string()).optional(),
});

export type Task = z.infer<typeof TaskSchema>;

/**
 * Validates task against DIR-011 compliance requirements
 * 
 * @param task - Task object to validate
 * @returns TaskValidationResult with validation status and any errors
 */
export function validateTask(task: unknown): TaskValidationResult {
  const errors: TaskValidationError[] = [];
  
  // First validate basic task structure
  const parseResult = TaskSchema.safeParse(task);
  if (!parseResult.success) {
    parseResult.error.errors.forEach(err => {
      errors.push({
        code: 'INVALID-TASK-STRUCTURE',
        message: `Invalid task structure: ${err.message}`,
        field: err.path.join('.'),
        value: String(err.code)
      });
    });
    
    return { valid: false, errors };
  }
  
  const validTask = parseResult.data;
  
  // Collect all file paths from various possible fields
  const allFilePaths: string[] = [
    ...(validTask.deliverableFiles || []),
    ...(validTask.codeDeliverables || []),
    ...(validTask.files || [])
  ];
  
  // Validate each file path
  for (const filePath of allFilePaths) {
    const error = validateFilePath(filePath);
    if (error) {
      errors.push(error);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates and throws if task violates DIR-011 compliance
 * Use this for fail-fast validation in task loaders
 * 
 * @param task - Task object to validate
 * @throws Error with DIR-011 compliance message if validation fails
 */
export function validateTaskOrThrow(task: unknown): void {
  const result = validateTask(task);
  
  if (!result.valid) {
    const errorMessages = result.errors.map(err => err.message).join('\n');
    throw new Error(`Task validation failed - DIR-011 compliance violation:\n\n${errorMessages}`);
  }
}

/**
 * Middleware function for Express-style task validation
 */
export function taskValidationMiddleware(req: any, res: any, next: any): void {
  try {
    validateTaskOrThrow(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Task Validation Failed',
      message: error instanceof Error ? error.message : 'Unknown validation error',
      code: 'DIR-011-VIOLATION'
    });
  }
}

/**
 * Utility function to check if a filename has forbidden patterns
 * Useful for quick checks without full task validation
 */
export function hasAtomicViolation(filename: string): boolean {
  const filenameWithoutExt = getFilenameWithoutExtension(filename);
  return FORBIDDEN_SUFFIX_PATTERNS.some(pattern => pattern.test(filenameWithoutExt));
}

export default {
  validateTask,
  validateTaskOrThrow,
  taskValidationMiddleware,
  hasAtomicViolation,
  FORBIDDEN_SUFFIX_PATTERNS
};