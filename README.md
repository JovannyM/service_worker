# service_worker
The service worker task is 
get Message from AWS SQS, 
download image from AWS S3, 
rotate the image to 180d, 
upload processed image to AWS S3 
and then update Dynamo DB item status.
