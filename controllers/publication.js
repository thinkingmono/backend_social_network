export const testPublication = (req, res) => {
  return res.status(200).send({
    message: "Message send from the publication's controller"
  })
}