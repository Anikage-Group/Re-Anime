export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'anilist_token')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const body = await readBody(event)
  const { mediaId, progress, status, action } = body || {}

  if (!mediaId) {
    throw createError({ statusCode: 400, statusMessage: 'mediaId is required' })
  }

  try {
    if (action === 'delete') {
      // Step 1: Resolve the authenticated user's list entry ID. AniList does
      // not reliably infer the user for MediaList queries from the token.
      const viewerRes = await $fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: { query: 'query { Viewer { id } }' }
      })
      const userId = viewerRes?.data?.Viewer?.id
      if (!userId) throw new Error(viewerRes?.errors?.[0]?.message || 'Could not identify AniList user')

      const listQuery = `
        query ($mediaId: Int, $userId: Int) {
          MediaList(mediaId: $mediaId, userId: $userId) {
            id
          }
        }
      `
      const listRes = await $fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: { query: listQuery, variables: { mediaId: Number(mediaId), userId } }
      })
      if (listRes?.errors?.length) throw new Error(listRes.errors[0].message)

      const listEntryId = listRes?.data?.MediaList?.id
      if (listEntryId) {
        // Step 2: Delete it
        const deleteMutation = `
          mutation ($id: Int) {
            DeleteMediaListEntry(id: $id) {
              deleted
            }
          }
        `
        const deleteRes = await $fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: { query: deleteMutation, variables: { id: listEntryId } }
        })
        if (deleteRes?.errors?.length || !deleteRes?.data?.DeleteMediaListEntry?.deleted) {
          throw new Error(deleteRes?.errors?.[0]?.message || 'AniList did not delete the list entry')
        }
      }
      return { success: true, deleted: true }

    } else {
      // Action is 'save'
      const saveMutation = `
        mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus) {
          SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status) {
            id
            mediaId
            status
            progress
          }
        }
      `
      const variables = { mediaId: Number(mediaId) }
      if (typeof progress === 'number') variables.progress = progress
      
      // Map frontend status to AniList status enum if provided
      if (status) {
        const statusMap = {
          'watching': 'CURRENT',
          'reading': 'CURRENT',
          'planning': 'PLANNING',
          'completed': 'COMPLETED',
          'dropped': 'DROPPED',
          'paused': 'PAUSED'
        }
        variables.status = statusMap[status.toLowerCase()] || 'CURRENT'
      }

      const saveRes = await $fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: { query: saveMutation, variables }
      })
      if (saveRes?.errors?.length || !saveRes?.data?.SaveMediaListEntry) {
        throw new Error(saveRes?.errors?.[0]?.message || 'AniList did not save the list entry')
      }

      return { success: true, data: saveRes?.data?.SaveMediaListEntry }
    }
  } catch (error) {
    console.error('AniList Sync Error:', error?.data || error.message)
    throw createError({ statusCode: 500, statusMessage: 'Failed to sync with AniList' })
  }
})
