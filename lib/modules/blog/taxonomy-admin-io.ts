/**
 * Blog Taxonomy Admin IO Facade (Server-only)
 *
 * Re-exports admin CRUD operations for Blog Groups, Topics, Tags, and Post relations.
 * This is a facade module that aggregates smaller IO modules.
 * Follows ARCHITECTURE.md §3.4 IO module pattern.
 *
 * @see lib/modules/blog/taxonomy-groups-admin-io.ts - Groups CRUD
 * @see lib/modules/blog/taxonomy-topics-admin-io.ts - Topics CRUD
 * @see lib/modules/blog/taxonomy-tags-admin-io.ts - Tags CRUD
 * @see lib/modules/blog/taxonomy-post-relations-admin-io.ts - Post relations
 * @see lib/types/blog-taxonomy.ts - Type definitions
 */

import 'server-only';

// Re-export from Groups IO
export {
    getAllBlogGroupsAdmin,
    getBlogGroupByIdAdmin,
    createBlogGroup,
    updateBlogGroup,
    deleteBlogGroup,
    reorderBlogGroups,
} from './taxonomy-groups-admin-io';

// Re-export from Topics IO
export {
    getAllBlogTopicsAdmin,
    getTopicsByGroupIdAdmin,
    getBlogTopicByIdAdmin,
    createBlogTopic,
    updateBlogTopic,
    deleteBlogTopic,
    reorderBlogTopics,
} from './taxonomy-topics-admin-io';

// Re-export from Tags IO
export {
    getAllBlogTagsAdmin,
    getBlogTagByIdAdmin,
    createBlogTag,
    updateBlogTag,
    deleteBlogTag,
    mergeBlogTags,
    getOrCreateTag,
} from './taxonomy-tags-admin-io';

// Re-export from Posts IO (taxonomy relations)
export {
    updatePostGroup,
    updatePostTopics,
    updatePostTags,
    updatePostTaxonomy,
} from './taxonomy-post-relations-admin-io';

