import Publication from '../models/publications.js';
import { followUserIds } from '../services/followServices.js';

export const testPublication = (req, res) => {
  return res.status(200).send({
    message: "Message send from the publication's controller"
  })
}

// Save publication in the db
export const savePublication = async (req, res) => {
  try {
    // Get publication data from the request body.
    const params = req.body;

    // Check if there's a publication text
    if (!params.text) {
      return res.status(400).send({
        status: "error",
        message: "You should send the publication text"
      });
    }

    // Create a Publicaiton object
    let newPublication = new Publication(params);

    // Add into the Publication object the authenticated user info.
    newPublication.user_id = req.user.userId;

    // Save the new publication in the db.
    const publicationStored = await newPublication.save();

    if (!publicationStored) {
      return res.status(500).send({
        status: "error",
        message: "There was an error. Publication not save"
      });
    }

    return res.status(200).json({
      status: "success",
      message: "¡Publication saved successfully!",
      publicationStored
    });

  } catch (error) {
    console.log(`There was an error creating the publication: ${error}`);
    return res.status(500).send({
      status: "error",
      message: "There was an error creating the publication"
    });
  }
};

// Show publication
export const showPublication = async (req, res) => {
  try {
    // Get publication id from the request params.
    const publicationId = req.params.id;

    // Search for publication by id
    const publicationStored = await Publication.findById(publicationId).populate('user_id', 'name last_name');

    if (!publicationStored) {
      return res.status(404).send({
        status: "error",
        message: "Publication does not exist"
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Publication found",
      publication: publicationStored
    });

  } catch (error) {
    console.log(`There was an error showing the publication: ${error}`);
    return res.status(500).send({
      status: "error",
      message: "There was an error showing the publication"
    });
  }
};

// Delete publication
export const deletePublication = async (req, res) => {
  try {
    // Get publication id from the request params.
    const publicationId = req.params.id;

    // Search and delete publication by id.
    const publicationDeleted = await Publication.findOneAndDelete({ user_id: req.user.userId, _id: publicationId }).populate('user_id', 'name last_name');

    if (!publicationDeleted) {
      return res.status(404).send({
        status: "error",
        message: "Publication not found or you dont have permission to delete it"
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Publication deleted",
      publication: publicationDeleted
    });

  } catch (error) {
    console.log(`There was an error deleting the publication: ${error}`);
    return res.status(500).send({
      status: "error",
      message: "There was an error deleting the publication"
    });
  }
};

// List user publications
export const publicationsUser = async (req, res) => {
  try {
    // Get user id
    const userId = req.params.id;

    // Set page to show
    let page = req.params.page ? parseInt(req.params.page, 10) : 1;

    // Set items per page to show
    let itemsPerPage = req.query.limit ? parseInt(req.query.limit, 10) : 5;

    // Set query options
    const options = {
      page: page,
      limit: itemsPerPage,
      sort: { created_at: -1 },
      populate: {
        path: 'user_id',
        select: '-password -role -__v -email'
      },
      lean: true
    };

    // Look for user's publications
    const publications = await Publication.paginate({ user_id: userId }, options);

    if (!publications.docs || publications.docs.length <= 0) {
      return res.status(404).send({
        status: "error",
        message: "There are no publications to show"
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Publicaciones del usuario: ",
      publications: publications.docs,
      total: publications.totalDocs,
      pages: publications.totalPages,
      page: publications.page,
      limit_items_ppage: publications.limit
    });

  } catch (error) {
    console.log(`There was an error showing the publications: ${error}`);
    return res.status(500).send({
      status: "error",
      message: "There was an error showing the publications"
    });
  }
};

// Upload images to a publication
export const uploadMedia = async (req, res) => {
  try {
    // Get publication id
    const publicationId = req.params.id;

    // Check if the publication exist in the database
    const publicationExists = await Publication.findById(publicationId);

    if (!publicationExists) {
      return res.status(404).send({
        status: "error",
        message: "The publication does not exist"
      });
    }

    // Check if theres a file in the request
    if (!req.file) {
      return res.status(400).send({
        status: "error",
        message: "The request does not include an image"
      });
    }

    // Get image url form cloudinary
    const mediaUrl = req.file.path;

    // update the publication with the new imge path.
    const publicationUpdated = await Publication.findByIdAndUpdate(
      publicationId,
      { file: mediaUrl },
      { new: true }
    );

    if (!publicationUpdated) {
      return res.status(500).send({
        status: "error",
        message: "There was an error uploading the image"
      });
    }

    return res.status(200).json({
      status: "success",
      message: "File uploaded successfully",
      publication: publicationUpdated,
      file: mediaUrl
    });

  } catch (error) {
    console.log(`There was an error uploading your image: ${error}`);
    return res.status(500).send({
      status: "error",
      message: "There was an error uploading your image"
    });
  }
};

// Show the image upload in the publication
export const showMedia = async (req, res) => {
  try {
    // Get the publication id
    const publicationId = req.params.id;

    // Look for the publication in the db
    const publication = await Publication.findById(publicationId).select('file');

    // Check if publication exist and has a file
    if (!publication || !publication.file) {
      return res.status(404).send({
        status: "error",
        message: "File for this publication does not exist"
      });
    }

    // Redirect to image cloudinary path
    return res.redirect(publication.file);

  } catch (error) {
    console.error("There was an error showing the publication image", error);
    return res.status(500).send({
      status: "error",
      message: "There was an error showing the publication image"
    });
  }
}

// List all the publications from the users i follow. (feed)
export const feed = async (req, res) => {
  try {
    // Set page number
    let page = req.params.page ? parseInt(req.params.page, 10) : 1;

    // Set items oper page to show
    let itemsPerPage = req.query.limit ? parseInt(req.query.limit, 10) : 5;

    if (!req.user || !req.user.userId) {
      return res.status(404).send({
        status: "error",
        message: "User is not authenticated"
      });
    }

    // Get an array with the users the authenticated user follows
    const myFollows = await followUserIds(req);

    if (!myFollows.following || myFollows.following.length === 0) {
      return res.status(404).send({
        status: "error",
        message: "You are not following any user. There are no publications to show"
      });
    }

    // Query options
    const options = {
      page: page,
      limit: itemsPerPage,
      sort: { created_at: -1 },
      populate: {
        path: 'user_id',
        select: '-password -role -__v -email'
      },
      lean: true
    };

    // Query db with paginate
    const result = await Publication.paginate(
      { user_id: { $in: myFollows.following } },
      options
    );

    // Check if there publications in the result
    if (!result.docs || result.docs.length <= 0) {
      return res.status(404).send({
        status: "error",
        message: "There are no publications to show"
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Publications Feed",
      publications: result.docs,
      total: result.totalDocs,
      pages: result.totalPages,
      page: result.page,
      limit: result.limit
    });

  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "There was an error showing your publications feed"
    });
  }
}