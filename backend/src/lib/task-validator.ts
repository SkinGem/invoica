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
        message: `File "${filePath}" violates DIR-011 atomic file change requirement. Filename contains multi-part suffix pattern. Tasks must contain only single atomic file changes.`,
        field: 'codeDeliverables',
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
  codeDeliverables: z.array(z.string()).optional(),
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
  
  const validatedTask = parseResult.data;
  
  // Validate code deliverables for DIR-011 compliance
  if (validatedTask.codeDeliverables) {
    for (const filePath of validatedTask.codeDeliverables) {
      const validationError = validateFilePath(filePath);
      if (validationError) {
        errors.push(validationError);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates and throws error if task violates DIR-011
 * Use this in orchestrator task loader for fail-fast behavior
 */
export function validateTaskOrThrow(task: unknown): Task {
  const result = validateTask(task);
  
  if (!result.valid) {
    const errorMessages = result.errors.map(err => err.message).join('; ');
    throw new Error(`Task validation failed: ${errorMessages}`);
  }
  
  return task as Task;
}