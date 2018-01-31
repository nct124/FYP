<script type="text/javascript">
var test = <?php echo json_encode($_POST['test']); ?>
<?php print_r($_POST); ?>
function rdy(){
	document.write(test);
}
</script>
<body onload="rdy()">
</body>
